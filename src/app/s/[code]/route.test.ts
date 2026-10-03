import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveShortLink } from "@/lib/short-link-store";
import { GET } from "./route";

vi.mock("@/lib/short-link-store", () => ({ resolveShortLink: vi.fn() }));

function get(code: string) {
  return GET(new Request(`https://site.test/s/${code}`), {
    params: Promise.resolve({ code }),
  });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /s/[code]", () => {
  it("redirects (302) to the stored URL", async () => {
    vi.mocked(resolveShortLink).mockResolvedValue(
      "https://example.com/target?x=1",
    );
    const response = await get("abc1234");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://example.com/target?x=1",
    );
    expect(resolveShortLink).toHaveBeenCalledWith("abc1234");
  });

  it("answers 404 for an unknown code", async () => {
    vi.mocked(resolveShortLink).mockResolvedValue(null);
    expect((await get("Zzzzzzz")).status).toBe(404);
  });

  it.each([
    "abc",
    "abc12345",
    "abc-123",
    "..%2F..%2F",
  ])("answers 404 for the malformed code %j without querying Redis", async (code) => {
    vi.mocked(resolveShortLink).mockClear();
    expect((await get(code)).status).toBe(404);
    expect(resolveShortLink).not.toHaveBeenCalled();
  });

  it("answers 503 when Redis is unavailable", async () => {
    vi.mocked(resolveShortLink).mockRejectedValue(new Error("down"));
    expect((await get("abc1234")).status).toBe(503);
  });
});
