import { NextResponse } from "next/server";
import {
  jsonError,
  rateLimitResponse,
  upstreamErrorResponse,
} from "@/lib/market-api";
import { getRange, isValidSymbol } from "@/lib/market-data";
import { getChart } from "@/lib/yahoo-finance";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const symbol = params.get("symbol") ?? "";
  const range = getRange(params.get("range") ?? "1d");

  if (!isValidSymbol(symbol)) return jsonError("Invalid symbol.", 400);
  if (!range) return jsonError("Invalid range.", 400);

  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  try {
    return NextResponse.json(await getChart(symbol, range.id));
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
