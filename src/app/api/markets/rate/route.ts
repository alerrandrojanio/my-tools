import { NextResponse } from "next/server";
import { rateLimitResponse, upstreamErrorResponse } from "@/lib/market-api";
import { getQuote } from "@/lib/yahoo-finance";

/** Current USD→BRL rate, used to show prices in either currency. */
export async function GET(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  try {
    const quote = await getQuote("USDBRL=X");
    return NextResponse.json({
      usdBrl: quote.price,
      updatedAt: quote.updatedAt,
    });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
