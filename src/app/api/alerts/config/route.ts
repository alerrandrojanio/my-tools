import { NextResponse } from "next/server";
import { jsonError } from "@/lib/market-api";
import { getVapidPublicKey, isPushConfigured } from "@/lib/push-send";

/**
 * Tells the page whether alerts are available and which public key to
 * subscribe with. Read at runtime, so no rebuild is needed after changing it.
 */
export function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey || !isPushConfigured()) {
    return jsonError(
      "Push notifications are not configured on the server.",
      503,
    );
  }
  return NextResponse.json(
    { publicKey },
    { headers: { "Cache-Control": "no-store" } },
  );
}
