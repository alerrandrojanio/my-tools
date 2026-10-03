import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeRedis } from "@/test/fake-redis";
import { createShortLink, resolveShortLink } from "./short-link-store";
import { generateCode, isValidCode } from "./url-utils";

vi.mock("./redis-connection", async () => {
  const { fakeRedis } = await import("@/test/fake-redis");
  return { redisConnection: { getClient: async () => fakeRedis } };
});

vi.mock("./url-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./url-utils")>();
  return { ...actual, generateCode: vi.fn(actual.generateCode) };
});

beforeEach(() => {
  fakeRedis.reset();
  vi.mocked(generateCode).mockClear();
});

describe("createShortLink / resolveShortLink", () => {
  it("stores a URL under a valid code and resolves it back", async () => {
    const code = await createShortLink("https://example.com/a");
    expect(isValidCode(code)).toBe(true);
    expect(await resolveShortLink(code)).toBe("https://example.com/a");
  });

  it("returns the same code when the same URL is shortened again", async () => {
    const first = await createShortLink("https://example.com/a");
    const second = await createShortLink("https://example.com/a");
    expect(second).toBe(first);
    expect(generateCode).toHaveBeenCalledTimes(1);
  });

  it("gives different URLs different codes", async () => {
    const a = await createShortLink("https://example.com/a");
    const b = await createShortLink("https://example.com/b");
    expect(a).not.toBe(b);
    expect(await resolveShortLink(a)).toBe("https://example.com/a");
    expect(await resolveShortLink(b)).toBe("https://example.com/b");
  });

  it("returns null for an unknown code", async () => {
    expect(await resolveShortLink("Zzzzzzz")).toBeNull();
  });

  it("retries with a new code when one is already taken, never overwriting", async () => {
    vi.mocked(generateCode)
      .mockReturnValueOnce("AAAAAAA")
      .mockReturnValueOnce("AAAAAAA")
      .mockReturnValueOnce("BBBBBBB");

    expect(await createShortLink("https://one.example.com")).toBe("AAAAAAA");
    expect(await createShortLink("https://two.example.com")).toBe("BBBBBBB");
    expect(await resolveShortLink("AAAAAAA")).toBe("https://one.example.com");
  });

  it("gives up after repeated collisions", async () => {
    await fakeRedis.set("shortlink:CCCCCCC", "https://taken.example.com");
    vi.mocked(generateCode).mockReturnValue("CCCCCCC");

    await expect(createShortLink("https://new.example.com")).rejects.toThrow(
      "Could not allocate a unique short code.",
    );
    expect(generateCode).toHaveBeenCalledTimes(5);
    expect(await resolveShortLink("CCCCCCC")).toBe("https://taken.example.com");
  });
});
