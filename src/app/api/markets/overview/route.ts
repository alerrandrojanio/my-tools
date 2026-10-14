import { NextResponse } from "next/server";
import { getWatchList } from "@/data/market-lists";
import { jsonError, rateLimitResponse } from "@/lib/market-api";
import { getQuote } from "@/lib/yahoo-finance";

export async function GET(request: Request) {
  const list = getWatchList(
    new URL(request.url).searchParams.get("list") ?? "",
  );
  if (!list) return jsonError("Unknown list.", 400);

  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  // One failing symbol must not hide the other nine.
  const settled = await Promise.allSettled(
    list.items.map((item) => getQuote(item.symbol)),
  );

  const items = list.items.map((item, index) => {
    const result = settled[index];
    return {
      symbol: item.symbol,
      name: item.name,
      quote: result.status === "fulfilled" ? result.value : null,
    };
  });

  if (items.every((item) => item.quote === null)) {
    return jsonError("Market data is unavailable right now.", 502);
  }
  return NextResponse.json({ list: list.id, items });
}
