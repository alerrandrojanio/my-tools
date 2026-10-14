import { describe, expect, it } from "vitest";
import {
  buildAlertPayload,
  cleanLabel,
  describeDevice,
  evaluateAlert,
  formatTarget,
  isValidDeviceId,
  type PriceAlert,
  urlBase64ToBytes,
  validateAlertInput,
  validateSubscription,
} from "./alert-utils";

const alert = (over: Partial<PriceAlert> = {}): PriceAlert => ({
  id: "a1",
  symbol: "AAPL",
  name: "Apple",
  condition: "above",
  target: 350,
  currency: "USD",
  from: null,
  createdAt: 0,
  triggeredAt: null,
  ...over,
});

describe("isValidDeviceId / cleanLabel", () => {
  it("accepts uuids and rejects junk", () => {
    expect(isValidDeviceId(crypto.randomUUID())).toBe(true);
    for (const bad of [
      "",
      "short",
      "a b c d e f g h i j k l",
      "../../etc/passwd",
      5,
      null,
    ]) {
      expect(isValidDeviceId(bad)).toBe(false);
    }
  });

  it("trims, collapses spaces, strips control chars and truncates labels", () => {
    expect(cleanLabel("  DESKTOP   ALE\u0000\n ")).toBe("DESKTOP ALE");
    expect(cleanLabel("x".repeat(100))).toHaveLength(40);
    expect(cleanLabel(42)).toBe("");
  });
});

describe("validateSubscription", () => {
  const sub = (endpoint: string) => ({
    endpoint,
    keys: { p256dh: "k", auth: "a" },
  });

  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://web.push.apple.com/abc",
    "https://jmt17.google.com/fcm/send/abc",
    "https://push.services.mozilla.com/wpush/v2/abc",
  ])("accepts the browser push service %s", (endpoint) => {
    expect(validateSubscription(sub(endpoint)).ok).toBe(true);
  });

  it("accepts the long endpoints Edge gets from Windows (WNS)", () => {
    const edge = `https://wns2-bl2p.notify.windows.com/w/?token=${"A".repeat(1500)}`;
    expect(validateSubscription(sub(edge)).ok).toBe(true);
  });

  it("explains why a subscription was rejected", () => {
    expect(validateSubscription(sub("https://evil.example.com/x"))).toEqual({
      ok: false,
      error:
        "Invalid push subscription: unknown push service evil.example.com.",
    });
    expect(
      validateSubscription(
        sub(`https://fcm.googleapis.com/${"a".repeat(5000)}`),
      ),
    ).toMatchObject({ ok: false, error: expect.stringContaining("too long") });
  });

  it.each([
    "http://fcm.googleapis.com/x",
    "https://evil.example.com/x",
    "https://fcm.googleapis.com.evil.com/x",
    "https://notgoogle.com/x",
    "https://google.com.evil.com/x",
    "https://169.254.169.254/latest",
    "https://localhost/x",
    "not a url",
  ])("rejects the endpoint %s (SSRF guard)", (endpoint) => {
    expect(validateSubscription(sub(endpoint)).ok).toBe(false);
  });

  it("rejects malformed shapes", () => {
    expect(validateSubscription(null).ok).toBe(false);
    expect(
      validateSubscription({ endpoint: "https://fcm.googleapis.com/x" }).ok,
    ).toBe(false);
    expect(
      validateSubscription({
        endpoint: "https://fcm.googleapis.com/x",
        keys: { p256dh: 1, auth: 2 },
      }).ok,
    ).toBe(false);
  });
});

describe("validateAlertInput", () => {
  const good = {
    symbol: "AAPL",
    name: "Apple",
    condition: "above",
    target: 350,
    currency: "USD",
  };

  it("accepts a valid alert", () => {
    expect(validateAlertInput(good)).toEqual({ ok: true, value: good });
  });

  it("falls back to the symbol when the name is empty", () => {
    expect(validateAlertInput({ ...good, name: "" })).toMatchObject({
      ok: true,
      value: { name: "AAPL" },
    });
  });

  it.each([
    [{ ...good, symbol: "../x" }],
    [{ ...good, condition: "equal" }],
    [{ ...good, target: 0 }],
    [{ ...good, target: -5 }],
    [{ ...good, target: Number.NaN }],
    [{ ...good, target: "350" }],
    [{ ...good, target: 1e13 }],
    [{ ...good, currency: "usd" }],
    [{ ...good, currency: "US" }],
    [null],
  ])("rejects %j", (input) => {
    expect(validateAlertInput(input).ok).toBe(false);
  });
});

describe("evaluateAlert", () => {
  it("fires above/below in the same currency, inclusive", () => {
    expect(evaluateAlert(alert(), 350, "USD", null)).toBe(true);
    expect(evaluateAlert(alert(), 349.99, "USD", null)).toBe(false);
    expect(
      evaluateAlert(
        alert({ condition: "below", target: 300 }),
        300,
        "USD",
        null,
      ),
    ).toBe(true);
    expect(
      evaluateAlert(
        alert({ condition: "below", target: 300 }),
        300.01,
        "USD",
        null,
      ),
    ).toBe(false);
  });

  it("converts the price into the target's currency", () => {
    // 60 BRL at 5.0 BRL/USD = 12 USD
    expect(
      evaluateAlert(alert({ target: 12, currency: "USD" }), 60, "BRL", 5),
    ).toBe(true);
    expect(
      evaluateAlert(alert({ target: 13, currency: "USD" }), 60, "BRL", 5),
    ).toBe(false);
    // 10 USD at 5.0 = 50 BRL
    expect(
      evaluateAlert(alert({ target: 50, currency: "BRL" }), 10, "USD", 5),
    ).toBe(true);
  });

  it("returns null when it cannot compare", () => {
    expect(
      evaluateAlert(alert({ currency: "USD" }), 60, "BRL", null),
    ).toBeNull();
    expect(evaluateAlert(alert({ currency: "USD" }), 60, "EUR", 5)).toBeNull();
  });
});

describe("evaluateAlert: reaches", () => {
  const reaches = (from: number | null, target = 100) =>
    alert({ condition: "reaches", target, from });

  it("fires when climbing up to the target", () => {
    expect(evaluateAlert(reaches(90), 99.99, "USD", null)).toBe(false);
    expect(evaluateAlert(reaches(90), 100, "USD", null)).toBe(true);
    expect(evaluateAlert(reaches(90), 130, "USD", null)).toBe(true);
  });

  it("fires when falling down to the target", () => {
    expect(evaluateAlert(reaches(110), 100.01, "USD", null)).toBe(false);
    expect(evaluateAlert(reaches(110), 100, "USD", null)).toBe(true);
    expect(evaluateAlert(reaches(110), 80, "USD", null)).toBe(true);
  });

  it("does not fire on the wrong side of the start", () => {
    expect(evaluateAlert(reaches(90), 50, "USD", null)).toBe(false);
    expect(evaluateAlert(reaches(110), 150, "USD", null)).toBe(false);
  });

  it("uses a tiny tolerance when it started exactly on the target", () => {
    expect(evaluateAlert(reaches(100), 100.04, "USD", null)).toBe(true);
    expect(evaluateAlert(reaches(100), 101, "USD", null)).toBe(false);
  });

  it("cannot be evaluated without a starting price", () => {
    expect(evaluateAlert(reaches(null), 100, "USD", null)).toBeNull();
  });

  it("validates and words the notification", () => {
    expect(
      validateAlertInput({
        symbol: "AAPL",
        name: "Apple",
        condition: "reaches",
        target: 100,
        currency: "USD",
      }).ok,
    ).toBe(true);
    expect(buildAlertPayload(reaches(90), 100, "USD", null, "").title).toBe(
      "Apple reached $100.00",
    );
  });
});

describe("describeDevice", () => {
  it("names the system and browser", () => {
    const edge =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0";
    const chrome =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
    const firefox =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0";
    const android =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36";
    expect(describeDevice(edge)).toBe("Windows · Edge");
    expect(describeDevice(chrome)).toBe("Windows · Chrome");
    expect(describeDevice(firefox)).toBe("Windows · Firefox");
    expect(describeDevice(android)).toBe("Android · Chrome");
    expect(describeDevice("", "Windows")).toBe("Windows");
    expect(describeDevice("")).toBe("");
  });
});

describe("payload and helpers", () => {
  it("builds the notification text and link", () => {
    const payload = buildAlertPayload(
      alert(),
      351.2,
      "USD",
      null,
      "DESKTOP-ALE",
    );
    expect(payload.title).toBe("Apple rose above $350.00");
    expect(payload.body).toBe("Now $351.20 · DESKTOP-ALE");
    expect(payload.url).toBe("/tools/market-quotes?symbol=AAPL");
    expect(payload.tag).toBe("alert-a1");
  });

  it("shows the price in the alert currency and omits an empty device name", () => {
    const payload = buildAlertPayload(
      alert({
        condition: "below",
        target: 11,
        currency: "USD",
        name: "Petrobras",
        symbol: "PETR4.SA",
      }),
      50,
      "BRL",
      5,
      "",
    );
    expect(payload.title).toBe("Petrobras fell below $11.00");
    expect(payload.body).toBe("Now $10.00");
    expect(payload.url).toBe("/tools/market-quotes?symbol=PETR4.SA");
  });

  it("formats targets with a safe fallback", () => {
    expect(formatTarget(5.04, "BRL")).toContain("5.04");
    expect(formatTarget(0.0031, "BRL")).toContain("0.0031");
    expect(formatTarget(12, "NOT-A-CODE")).toBe("12.00 NOT-A-CODE");
  });

  it("decodes URL-safe base64 keys", () => {
    expect(Array.from(urlBase64ToBytes("SGk"))).toEqual([72, 105]);
    expect(Array.from(urlBase64ToBytes("-_8"))).toEqual([251, 255]);
  });
});
