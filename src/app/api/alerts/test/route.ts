import { NextResponse } from "next/server";
import {
  deleteDevice,
  getDevice,
  getTelegramChat,
  removeTelegramChat,
} from "@/lib/alert-store";
import { isValidDeviceId } from "@/lib/alert-utils";
import { jsonError, rateLimitResponse } from "@/lib/market-api";
import { isPushConfigured, sendPush } from "@/lib/push-send";
import { buildTelegramText, sendTelegramMessage } from "@/lib/telegram";

/** Sends a sample notification to the caller's own device. */
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  let deviceId: unknown;
  try {
    deviceId = ((await request.json()) as { deviceId?: unknown }).deviceId;
  } catch {
    return jsonError("Invalid request body.", 400);
  }
  if (!isValidDeviceId(deviceId)) return jsonError("Invalid device.", 400);
  if (!isPushConfigured()) {
    return jsonError(
      "Push notifications are not configured on the server.",
      503,
    );
  }

  try {
    const device = await getDevice(deviceId);
    if (!device) {
      return jsonError("This device is not registered for alerts.", 404);
    }

    const payload = {
      title: "My Tools: notifications are on",
      body: device.label
        ? `You will get price alerts on ${device.label}.`
        : "You will get price alerts on this device.",
      url: "/tools/market-quotes",
      tag: "test",
    };
    const result = await sendPush(device.subscription, payload);

    // Also try Telegram, so the user can confirm both channels at once.
    const chatId = await getTelegramChat(deviceId);
    if (chatId !== null) {
      const telegram = await sendTelegramMessage(
        chatId,
        buildTelegramText(payload, new URL(request.url).origin),
      );
      if (telegram === "gone") await removeTelegramChat(deviceId);
    }

    if (result === "gone") {
      await deleteDevice(deviceId);
      return jsonError(
        "This browser's subscription expired. Turn notifications on again.",
        410,
      );
    }
    return result === "sent"
      ? NextResponse.json({ ok: true })
      : jsonError("The notification could not be delivered.", 502);
  } catch (error) {
    console.error("[alerts] test", error);
    return jsonError("Could not send the notification. Try again later.", 500);
  }
}
