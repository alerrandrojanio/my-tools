import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runAlertCheck } from "@/lib/alert-checker";
import { jsonError } from "@/lib/market-api";
import { isPushConfigured } from "@/lib/push-send";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called by a scheduler (GitHub Actions, Vercel Cron...) to evaluate all alerts. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) return jsonError("Unauthorized.", 401);
  if (!isPushConfigured()) {
    return jsonError("Push notifications are not configured.", 503);
  }

  try {
    return NextResponse.json(await runAlertCheck());
  } catch (error) {
    console.error("[alerts] check", error);
    return jsonError("The alert check failed.", 500);
  }
}
