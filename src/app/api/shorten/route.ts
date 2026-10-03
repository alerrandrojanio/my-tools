import { NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { createShortLink } from "@/lib/short-link-store";
import { normalizeUrl } from "@/lib/url-utils";

const RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 60;

/** Base for generated links: SHORT_LINK_BASE_URL if set, else the request's origin. */
function shortLinkBase(request: Request): string {
  const configured = process.env.SHORT_LINK_BASE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      console.error("[shorten] SHORT_LINK_BASE_URL is not a valid URL.");
    }
  }
  return new URL(request.url).origin;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || "unknown";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const rawUrl =
    typeof body === "object" && body !== null && "url" in body
      ? body.url
      : undefined;
  if (typeof rawUrl !== "string") {
    return NextResponse.json({ error: "Enter a URL." }, { status: 400 });
  }

  const normalized = normalizeUrl(rawUrl);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  try {
    const limited = await isRateLimited(
      clientIp(request),
      RATE_LIMIT,
      RATE_WINDOW_SECONDS,
    );
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 },
      );
    }

    const code = await createShortLink(normalized.value);
    return NextResponse.json({
      code,
      shortUrl: `${shortLinkBase(request)}/s/${code}`,
    });
  } catch (error) {
    console.error("[shorten]", error);
    return NextResponse.json(
      { error: "Could not create the short link. Try again later." },
      { status: 500 },
    );
  }
}
