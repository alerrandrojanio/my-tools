import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeRedis } from "@/test/fake-redis";
import { isRateLimited } from "./rate-limit";

vi.mock("./redis-connection", async () => {
  const { fakeRedis } = await import("@/test/fake-redis");
  return { redisConnection: { getClient: async () => fakeRedis } };
});

beforeEach(() => fakeRedis.reset());

describe("isRateLimited", () => {
  it("allows requests up to the limit and blocks the next one", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await isRateLimited("ip-1", 3, 60)).toBe(false);
    }
    expect(await isRateLimited("ip-1", 3, 60)).toBe(true);
    expect(await isRateLimited("ip-1", 3, 60)).toBe(true);
  });

  it("tracks each key separately", async () => {
    await isRateLimited("ip-1", 1, 60);
    expect(await isRateLimited("ip-1", 1, 60)).toBe(true);
    expect(await isRateLimited("ip-2", 1, 60)).toBe(false);
  });

  it("sets the window expiry only on the first request", async () => {
    await isRateLimited("ip-1", 5, 42);
    expect(fakeRedis.expirations.get("ratelimit:ip-1")).toBe(42);

    fakeRedis.expirations.clear();
    await isRateLimited("ip-1", 5, 42);
    expect(fakeRedis.expirations.size).toBe(0);
  });
});
