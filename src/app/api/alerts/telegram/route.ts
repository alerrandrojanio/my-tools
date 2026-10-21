import { NextResponse } from "next/server";
import {
  createTelegramLinkToken,
  getDevice,
  getTelegramChat,
  removeTelegramChat,
} from "@/lib/alert-store";
import { isValidDeviceId } from "@/lib/alert-utils";
import { jsonError, rateLimitResponse } from "@/lib/market-api";
import {
  botUsername,
  buildStartLink,
  isTelegramConfigured,
} from "@/lib/telegram";

/** Only a registered device (holder of the secret device id) can link Telegram. */
async function registeredDevice(
  deviceId: unknown,
): Promise<string | NextResponse> {
  if (!isValidDeviceId(deviceId)) return jsonError("Invalid device.", 400);
  if (!(await getDevice(deviceId))) {
    return jsonError("This device is not registered for alerts.", 404);
  }
  return deviceId;
}

/** Whether Telegram is available on the server and linked to this device. */
export async function GET(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;
  if (!isTelegramConfigured()) {
    return NextResponse.json({ configured: false, linked: false });
  }

  try {
    const device = await registeredDevice(
      new URL(request.url).searchParams.get("deviceId"),
    );
    if (device instanceof NextResponse) return device;
    const chatId = await getTelegramChat(device);
    return NextResponse.json({ configured: true, linked: chatId !== null });
  } catch (error) {
    console.error("[telegram] status", error);
    return jsonError(
      "Could not load the Telegram status. Try again later.",
      500,
    );
  }
}

/** Creates a one-time link that opens the bot and ties the chat to this device. */
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  const username = botUsername();
  if (!isTelegramConfigured() || !username) {
    return jsonError("Telegram is not configured on the server.", 503);
  }

  let deviceId: unknown;
  try {
    deviceId = ((await request.json()) as { deviceId?: unknown }).deviceId;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  try {
    const device = await registeredDevice(deviceId);
    if (device instanceof NextResponse) return device;
    const token = await createTelegramLinkToken(device);
    return NextResponse.json({ url: buildStartLink(username, token) });
  } catch (error) {
    console.error("[telegram] link", error);
    return jsonError(
      "Could not create the Telegram link. Try again later.",
      500,
    );
  }
}

/** Stops sending this device's alerts to Telegram. */
export async function DELETE(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  try {
    const device = await registeredDevice(
      new URL(request.url).searchParams.get("deviceId"),
    );
    if (device instanceof NextResponse) return device;
    await removeTelegramChat(device);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram] unlink", error);
    return jsonError("Could not unlink Telegram. Try again later.", 500);
  }
}
