import { NextResponse } from "next/server";
import { deleteDevice, saveDevice } from "@/lib/alert-store";
import {
  cleanLabel,
  isValidDeviceId,
  validateSubscription,
} from "@/lib/alert-utils";
import { jsonError, rateLimitResponse } from "@/lib/market-api";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Registers (or refreshes) this browser's push subscription under its device id. */
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  const body = await readBody(request);
  if (!isValidDeviceId(body.deviceId)) {
    return jsonError("Invalid device.", 400);
  }
  const subscription = validateSubscription(body.subscription);
  if (!subscription.ok) {
    console.error("[alerts] rejected subscription:", subscription.error);
    return jsonError(subscription.error, 400);
  }

  try {
    await saveDevice(body.deviceId, cleanLabel(body.label), subscription.value);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[alerts] save device", error);
    return jsonError("Could not save this device. Try again later.", 500);
  }
}

/** Forgets the device and every alert it owns. */
export async function DELETE(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  const body = await readBody(request);
  if (!isValidDeviceId(body.deviceId)) {
    return jsonError("Invalid device.", 400);
  }

  try {
    await deleteDevice(body.deviceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[alerts] delete device", error);
    return jsonError("Could not remove this device. Try again later.", 500);
  }
}
