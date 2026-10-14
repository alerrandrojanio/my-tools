import { NextResponse } from "next/server";
import { isRateLimited } from "./rate-limit";
import { MarketDataError } from "./yahoo-finance";

const RATE_LIMIT = 240;
const RATE_WINDOW_SECONDS = 60;

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || "unknown";
}

/**
 * Per-IP request limit shared by the market endpoints. If Redis is down the
 * limit is skipped (fail open): quotes should keep working without it.
 */
export async function rateLimitResponse(
  request: Request,
): Promise<NextResponse | null> {
  try {
    const limited = await isRateLimited(
      `markets:${clientIp(request)}`,
      RATE_LIMIT,
      RATE_WINDOW_SECONDS,
    );
    return limited
      ? jsonError("Too many requests. Please wait a moment.", 429)
      : null;
  } catch (error) {
    console.error("[markets] rate limiter unavailable", error);
    return null;
  }
}

export function upstreamErrorResponse(error: unknown): NextResponse {
  if (error instanceof MarketDataError) {
    return jsonError(error.message, error.status);
  }
  console.error("[markets]", error);
  return jsonError("Market data is unavailable right now.", 502);
}
