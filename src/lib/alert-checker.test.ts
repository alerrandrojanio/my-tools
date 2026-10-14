import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeRedis } from "@/test/fake-redis";
import { runAlertCheck } from "./alert-checker";
import {
  addAlert,
  getDevice,
  listAlerts,
  listDeviceIds,
  saveDevice,
} from "./alert-store";
import { sendPush } from "./push-send";
import { getQuote } from "./yahoo-finance";

vi.mock("./redis-connection", async () => {
  const { fakeRedis } = await import("@/test/fake-redis");
  return { redisConnection: { getClient: async () => fakeRedis } };
});
vi.mock("./push-send", () => ({
  sendPush: vi.fn(),
  isPushConfigured: () => true,
}));
vi.mock("./yahoo-finance", () => ({ getQuote: vi.fn() }));

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const sub = (id: string) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
  keys: { p256dh: "k", auth: "a" },
});

function prices(map: Record<string, [number, string]>) {
  vi.mocked(getQuote).mockImplementation(async (symbol) => {
    const entry = map[symbol];
    if (!entry) throw new Error("no quote");
    return {
      symbol,
      name: symbol,
      currency: entry[1],
      exchange: "",
      price: entry[0],
      previousClose: null,
      priceHint: 2,
      updatedAt: 0,
    };
  });
}

const input = (over = {}) => ({
  symbol: "AAPL",
  name: "Apple",
  condition: "above" as const,
  target: 300,
  currency: "USD",
  ...over,
});

beforeEach(async () => {
  fakeRedis.reset();
  vi.mocked(sendPush).mockReset().mockResolvedValue("sent");
  prices({ AAPL: [345, "USD"], "USDBRL=X": [5, "BRL"] });
  await saveDevice(ME, "DESKTOP-ALE", sub("me"));
  await saveDevice(OTHER, "LAPTOP-BOB", sub("other"));
});

describe("runAlertCheck", () => {
  it("notifies only the device that owns the alert", async () => {
    await addAlert(ME, input());
    const summary = await runAlertCheck();

    expect(summary).toMatchObject({ devices: 2, sent: 1 });
    expect(sendPush).toHaveBeenCalledTimes(1);
    const [subscription, payload] = vi.mocked(sendPush).mock.calls[0];
    expect(subscription.endpoint).toContain("/me");
    expect(payload.body).toContain("DESKTOP-ALE");
    expect(payload.body).not.toContain("LAPTOP-BOB");
  });

  it("sends each alert to its own owner when both fire", async () => {
    await addAlert(ME, input());
    await addAlert(OTHER, input({ target: 200 }));
    await runAlertCheck();
    const endpoints = vi.mocked(sendPush).mock.calls.map(([s]) => s.endpoint);
    expect(endpoints.sort()).toEqual([
      "https://fcm.googleapis.com/fcm/send/me",
      "https://fcm.googleapis.com/fcm/send/other",
    ]);
  });

  it("does not fire when the condition is not met", async () => {
    await addAlert(ME, input({ target: 400 }));
    expect((await runAlertCheck()).sent).toBe(0);
    expect(sendPush).not.toHaveBeenCalled();
    expect((await listAlerts(ME))[0].triggeredAt).toBeNull();
  });

  it("fires once: the alert is marked triggered and skipped afterwards", async () => {
    await addAlert(ME, input());
    await runAlertCheck();
    expect((await listAlerts(ME))[0].triggeredAt).not.toBeNull();
    await runAlertCheck();
    expect(sendPush).toHaveBeenCalledTimes(1);
  });

  it("supports a target in another currency", async () => {
    // Apple at 345 USD = 1725 BRL
    await addAlert(ME, input({ target: 1700, currency: "BRL" }));
    expect((await runAlertCheck()).sent).toBe(1);
    expect(vi.mocked(sendPush).mock.calls[0][1].title).toContain("R$1,700.00");
  });

  it("keeps the alert active when delivery fails, so it is retried", async () => {
    vi.mocked(sendPush).mockResolvedValue("failed");
    await addAlert(ME, input());
    await runAlertCheck();
    expect((await listAlerts(ME))[0].triggeredAt).toBeNull();
    vi.mocked(sendPush).mockResolvedValue("sent");
    expect((await runAlertCheck()).sent).toBe(1);
  });

  it("removes a device whose subscription is gone, with its alerts", async () => {
    vi.mocked(sendPush).mockResolvedValue("gone");
    await addAlert(ME, input());
    await addAlert(ME, input({ target: 100 }));
    const summary = await runAlertCheck();

    expect(summary.removedDevices).toBe(1);
    expect(sendPush).toHaveBeenCalledTimes(1);
    expect(await getDevice(ME)).toBeNull();
    expect(await listAlerts(ME)).toEqual([]);
    expect(await listDeviceIds()).toEqual([OTHER]);
  });

  it("skips assets whose quote failed and still handles the others", async () => {
    await addAlert(ME, input({ symbol: "BROKEN", name: "Broken" }));
    await addAlert(ME, input());
    const summary = await runAlertCheck();
    expect(summary.sent).toBe(1);
    expect(summary.checked).toBe(1);
  });

  it("does nothing without active alerts", async () => {
    expect(await runAlertCheck()).toMatchObject({ checked: 0, sent: 0 });
    expect(getQuote).not.toHaveBeenCalled();
  });
});
