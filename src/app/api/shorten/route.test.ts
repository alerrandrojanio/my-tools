import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRateLimited } from "@/lib/rate-limit";
import { createShortLink } from "@/lib/short-link-store";
import { POST } from "./route";

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: vi.fn() }));
vi.mock("@/lib/short-link-store", () => ({ createShortLink: vi.fn() }));

function post(
  body: unknown,
  init: { raw?: boolean; headers?: HeadersInit } = {},
) {
  return POST(
    new Request("https://site.test/api/shorten", {
      method: "POST",
      headers: init.headers,
      body: init.raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.mocked(isRateLimited).mockResolvedValue(false);
  vi.mocked(createShortLink).mockResolvedValue("abc1234");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/shorten", () => {
  it("creates a short link using the request's origin by default", async () => {
    const response = await post({ url: "example.com/page" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: "abc1234",
      shortUrl: "https://site.test/s/abc1234",
    });
    expect(createShortLink).toHaveBeenCalledWith("https://example.com/page");
  });

  it("uses SHORT_LINK_BASE_URL when configured", async () => {
    vi.stubEnv("SHORT_LINK_BASE_URL", "https://short.example.org/ignored/path");
    const response = await post({ url: "https://example.com" });
    expect((await response.json()).shortUrl).toBe(
      "https://short.example.org/s/abc1234",
    );
  });

  it("falls back to the request origin if SHORT_LINK_BASE_URL is invalid", async () => {
    vi.stubEnv("SHORT_LINK_BASE_URL", "not a url");
    const response = await post({ url: "https://example.com" });
    expect((await response.json()).shortUrl).toBe(
      "https://site.test/s/abc1234",
    );
  });

  it("rate limits by the first x-forwarded-for address", async () => {
    await post(
      { url: "https://example.com" },
      { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } },
    );
    expect(isRateLimited).toHaveBeenCalledWith("1.2.3.4", 20, 60);
  });

  it("answers 429 when rate limited, without creating a link", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    const response = await post({ url: "https://example.com" });
    expect(response.status).toBe(429);
    expect(createShortLink).not.toHaveBeenCalled();
  });

  it("answers 400 for a body that is not JSON", async () => {
    const response = await post("not json", { raw: true });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid request body." });
  });

  it.each([
    {},
    { url: 123 },
    null,
    "text",
  ])("answers 400 when url is missing or not a string: %j", async (body) => {
    expect((await post(body)).status).toBe(400);
  });

  it.each([
    "javascript:alert(1)",
    "ftp://example.com",
    "http://localhost",
    "   ",
  ])("answers 400 for the invalid URL %j without touching Redis", async (url) => {
    const response = await post({ url });
    expect(response.status).toBe(400);
    expect(isRateLimited).not.toHaveBeenCalled();
    expect(createShortLink).not.toHaveBeenCalled();
  });

  it("answers 500 with a generic message when Redis fails", async () => {
    vi.mocked(createShortLink).mockRejectedValue(
      new Error("connect ECONNREFUSED secret-host:1234"),
    );
    const response = await post({ url: "https://example.com" });

    expect(response.status).toBe(500);
    const text = JSON.stringify(await response.json());
    expect(text).toContain("Could not create the short link");
    expect(text).not.toContain("secret-host");
  });
});
