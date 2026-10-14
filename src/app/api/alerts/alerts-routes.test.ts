import { beforeEach, describe, expect, it, vi } from "vitest";
import { getQuote } from "@/lib/yahoo-finance";
import { fakeRedis } from "@/test/fake-redis";
import { GET as checkGET } from "./check/route";
import { DELETE as deviceDELETE, POST as devicePOST } from "./device/route";
import { DELETE, GET, POST } from "./route";

vi.mock("@/lib/redis-connection", async () => {
  const { fakeRedis } = await import("@/test/fake-redis");
  return { redisConnection: { getClient: async () => fakeRedis } };
});
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));
vi.mock("@/lib/alert-checker", () => ({
  runAlertCheck: vi.fn(async () => ({
    devices: 0,
    checked: 0,
    sent: 0,
    removedDevices: 0,
  })),
}));
vi.mock("@/lib/yahoo-finance", () => ({ getQuote: vi.fn() }));
vi.mock("@/lib/push-send", () => ({
  isPushConfigured: () => true,
  sendPush: vi.fn(),
}));

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const SUBSCRIPTION = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: { p256dh: "key", auth: "auth" },
};
const ALERT = {
  symbol: "AAPL",
  name: "Apple",
  condition: "above",
  target: 300,
  currency: "USD",
};

const json = (method: string, path: string, body: unknown) =>
  new Request(`https://site.test${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

async function register(deviceId: string, label = "PC") {
  return devicePOST(
    json("POST", "/api/alerts/device", {
      deviceId,
      label,
      subscription: SUBSCRIPTION,
    }),
  );
}

beforeEach(() => {
  fakeRedis.reset();
  vi.mocked(getQuote).mockReset();
  vi.mocked(getQuote).mockImplementation(async (symbol) => ({
    symbol,
    name: symbol,
    currency: symbol === "USDBRL=X" ? "BRL" : "USD",
    exchange: "",
    price: symbol === "USDBRL=X" ? 5 : 345,
    previousClose: null,
    priceHint: 2,
    updatedAt: 0,
  }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("CRON_SECRET", "s3cret");
});

describe("device registration", () => {
  it("registers a device and rejects bad input", async () => {
    expect((await register(ME)).status).toBe(200);
    expect((await register("short")).status).toBe(400);
    const evil = await devicePOST(
      json("POST", "/api/alerts/device", {
        deviceId: ME,
        subscription: {
          ...SUBSCRIPTION,
          endpoint: "https://evil.example.com/x",
        },
      }),
    );
    expect(evil.status).toBe(400);
  });

  it("removes the device together with its alerts", async () => {
    await register(ME);
    await POST(json("POST", "/api/alerts", { deviceId: ME, alert: ALERT }));
    await deviceDELETE(json("DELETE", "/api/alerts/device", { deviceId: ME }));
    expect(
      (await GET(new Request(`https://site.test/api/alerts?deviceId=${ME}`)))
        .status,
    ).toBe(404);
  });
});

describe("alerts per device", () => {
  it("creates and lists alerts for a registered device", async () => {
    await register(ME);
    const created = await POST(
      json("POST", "/api/alerts", { deviceId: ME, alert: ALERT }),
    );
    expect(created.status).toBe(201);

    const list = await GET(
      new Request(`https://site.test/api/alerts?deviceId=${ME}`),
    );
    const { alerts } = await list.json();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      symbol: "AAPL",
      target: 300,
      triggeredAt: null,
    });
  });

  it("refuses unregistered devices", async () => {
    const created = await POST(
      json("POST", "/api/alerts", { deviceId: ME, alert: ALERT }),
    );
    expect(created.status).toBe(404);
  });

  it("never shows or deletes another device's alerts", async () => {
    await register(ME);
    await register(OTHER);
    const created = await POST(
      json("POST", "/api/alerts", { deviceId: ME, alert: ALERT }),
    );
    const { alert } = await created.json();

    const others = await (
      await GET(new Request(`https://site.test/api/alerts?deviceId=${OTHER}`))
    ).json();
    expect(others.alerts).toEqual([]);

    const del = await DELETE(
      new Request(
        `https://site.test/api/alerts?deviceId=${OTHER}&id=${alert.id}`,
        { method: "DELETE" },
      ),
    );
    expect(del.status).toBe(404);

    const mine = await (
      await GET(new Request(`https://site.test/api/alerts?deviceId=${ME}`))
    ).json();
    expect(mine.alerts).toHaveLength(1);
  });

  it("deletes the owner's alert", async () => {
    await register(ME);
    const { alert } = await (
      await POST(json("POST", "/api/alerts", { deviceId: ME, alert: ALERT }))
    ).json();
    const del = await DELETE(
      new Request(
        `https://site.test/api/alerts?deviceId=${ME}&id=${alert.id}`,
        { method: "DELETE" },
      ),
    );
    expect(del.status).toBe(200);
  });

  it.each([
    { ...ALERT, target: -1 },
    { ...ALERT, condition: "x" },
    { ...ALERT, symbol: "../x" },
  ])("rejects the invalid alert %j", async (alert) => {
    await register(ME);
    expect(
      (await POST(json("POST", "/api/alerts", { deviceId: ME, alert }))).status,
    ).toBe(400);
  });

  it("records the current price when creating a 'reaches' alert", async () => {
    await register(ME);
    const created = await POST(
      json("POST", "/api/alerts", {
        deviceId: ME,
        alert: { ...ALERT, condition: "reaches", target: 400 },
      }),
    );
    expect(created.status).toBe(201);
    expect((await created.json()).alert.from).toBe(345);
  });

  it("converts the starting price into the alert currency", async () => {
    await register(ME);
    const created = await POST(
      json("POST", "/api/alerts", {
        deviceId: ME,
        alert: {
          ...ALERT,
          condition: "reaches",
          target: 2000,
          currency: "BRL",
        },
      }),
    );
    expect((await created.json()).alert.from).toBe(1725); // 345 USD at 5.0
  });

  it("refuses a 'reaches' alert when the price cannot be read", async () => {
    await register(ME);
    vi.mocked(getQuote).mockRejectedValue(new Error("down"));
    const created = await POST(
      json("POST", "/api/alerts", {
        deviceId: ME,
        alert: { ...ALERT, condition: "reaches", target: 400 },
      }),
    );
    expect(created.status).toBe(502);
  });

  it("limits the number of alerts per device", async () => {
    await register(ME);
    for (let i = 0; i < 20; i++) {
      expect(
        (
          await POST(
            json("POST", "/api/alerts", { deviceId: ME, alert: ALERT }),
          )
        ).status,
      ).toBe(201);
    }
    expect(
      (await POST(json("POST", "/api/alerts", { deviceId: ME, alert: ALERT })))
        .status,
    ).toBe(409);
  });
});

describe("GET /api/alerts/check", () => {
  const call = (auth?: string) =>
    checkGET(
      new Request("https://site.test/api/alerts/check", {
        headers: auth ? { authorization: auth } : {},
      }),
    );

  it("requires the scheduler secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect((await call("s3cret")).status).toBe(401);
    expect((await call("Bearer s3cret")).status).toBe(200);
  });

  it("is closed when no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
  });
});
