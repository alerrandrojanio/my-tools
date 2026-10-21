import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/market-api";
import { setWebhook } from "@/lib/telegram";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * One-time setup: tells Telegram to deliver the bot's messages to
 * /api/telegram/webhook on this site. Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) return jsonError("Unauthorized.", 401);

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !/^[A-Za-z0-9_-]{16,256}$/.test(secret)) {
    return jsonError(
      "Set TELEGRAM_WEBHOOK_SECRET (16+ letters, digits, _ or -).",
      503,
    );
  }

  const url = new URL("/api/telegram/webhook", request.url).toString();
  try {
    const result = await setWebhook(url, secret);
    return NextResponse.json(
      { webhook: url, ...result },
      {
        status: result.ok ? 200 : 502,
      },
    );
  } catch (error) {
    console.error("[telegram] setup", error);
    return jsonError("Could not reach Telegram.", 502);
  }
}
