import { NextResponse } from "next/server";
import {
  AlertLimitError,
  addAlert,
  getDevice,
  listAlerts,
  removeAlert,
} from "@/lib/alert-store";
import { isValidDeviceId, validateAlertInput } from "@/lib/alert-utils";
import { convertAmount } from "@/lib/currency-convert";
import { jsonError, rateLimitResponse } from "@/lib/market-api";
import { getQuote } from "@/lib/yahoo-finance";

/** Current price of the asset expressed in the alert's currency, or null. */
async function startingPrice(
  symbol: string,
  currency: string,
): Promise<number | null> {
  try {
    const quote = await getQuote(symbol);
    const rate =
      quote.currency === currency ? null : (await getQuote("USDBRL=X")).price;
    return convertAmount(quote.price, quote.currency, currency, rate);
  } catch {
    return null;
  }
}

/** Alerts are only visible to the device that owns the (secret) device id. */
async function ownerOrError(
  deviceId: unknown,
): Promise<{ deviceId: string } | NextResponse> {
  if (!isValidDeviceId(deviceId)) return jsonError("Invalid device.", 400);
  if (!(await getDevice(deviceId))) {
    return jsonError("This device is not registered for alerts.", 404);
  }
  return { deviceId };
}

export async function GET(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  try {
    const owner = await ownerOrError(
      new URL(request.url).searchParams.get("deviceId"),
    );
    if (owner instanceof NextResponse) return owner;
    return NextResponse.json({ alerts: await listAlerts(owner.deviceId) });
  } catch (error) {
    console.error("[alerts] list", error);
    return jsonError("Could not load alerts. Try again later.", 500);
  }
}

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }
  const record = (typeof body === "object" && body !== null ? body : {}) as {
    deviceId?: unknown;
    alert?: unknown;
  };

  const input = validateAlertInput(record.alert);
  if (!input.ok) return jsonError(input.error, 400);

  try {
    const owner = await ownerOrError(record.deviceId);
    if (owner instanceof NextResponse) return owner;
    const from =
      input.value.condition === "reaches"
        ? await startingPrice(input.value.symbol, input.value.currency)
        : null;
    if (input.value.condition === "reaches" && from === null) {
      return jsonError(
        "Could not read the current price to compare with. Try again.",
        502,
      );
    }
    const alert = await addAlert(owner.deviceId, input.value, from);
    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    if (error instanceof AlertLimitError) return jsonError(error.message, 409);
    console.error("[alerts] create", error);
    return jsonError("Could not save the alert. Try again later.", 500);
  }
}

export async function DELETE(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const alertId = params.get("id") ?? "";
  if (!/^[A-Za-z0-9-]{8,64}$/.test(alertId)) {
    return jsonError("Invalid alert.", 400);
  }

  try {
    const owner = await ownerOrError(params.get("deviceId"));
    if (owner instanceof NextResponse) return owner;
    const removed = await removeAlert(owner.deviceId, alertId);
    return removed
      ? NextResponse.json({ ok: true })
      : jsonError("Alert not found.", 404);
  } catch (error) {
    console.error("[alerts] delete", error);
    return jsonError("Could not remove the alert. Try again later.", 500);
  }
}
