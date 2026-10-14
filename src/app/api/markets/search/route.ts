import { NextResponse } from "next/server";
import {
  jsonError,
  rateLimitResponse,
  upstreamErrorResponse,
} from "@/lib/market-api";
import { searchSymbols } from "@/lib/yahoo-finance";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 40;

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();

  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return jsonError(
      `Search must be ${MIN_QUERY_LENGTH}–${MAX_QUERY_LENGTH} characters.`,
      400,
    );
  }

  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  try {
    return NextResponse.json({ results: await searchSymbols(query) });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
