import { NextResponse } from "next/server";
import { resolveShortLink } from "@/lib/short-link-store";
import { isValidCode } from "@/lib/url-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!isValidCode(code)) {
    return new NextResponse("Link not found.", { status: 404 });
  }

  try {
    const url = await resolveShortLink(code);
    if (!url) return new NextResponse("Link not found.", { status: 404 });
    return NextResponse.redirect(url, 302);
  } catch (error) {
    console.error("[redirect]", error);
    return new NextResponse("Service temporarily unavailable.", {
      status: 503,
    });
  }
}
