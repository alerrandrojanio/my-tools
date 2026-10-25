import { describe, expect, it } from "vitest";
import {
  type QrStyle,
  qrInfo,
  renderQrSvg,
  validateWifi,
  type WifiNetwork,
  wifiPayload,
} from "./qr-code";

const STYLE: QrStyle = {
  level: "M",
  foreground: "#112233",
  background: "#ffffff",
  margin: 4,
};

const NETWORK: WifiNetwork = {
  ssid: "Casa",
  password: "segredo123",
  security: "WPA",
  hidden: false,
};

describe("wifiPayload", () => {
  it("builds the standard Wi-Fi text", () => {
    expect(wifiPayload(NETWORK)).toBe("WIFI:T:WPA;S:Casa;P:segredo123;;");
  });

  it("escapes special characters", () => {
    expect(
      wifiPayload({ ...NETWORK, ssid: 'a;b,c:d"e\\f', password: "p;w" }),
    ).toBe('WIFI:T:WPA;S:a\\;b\\,c\\:d\\"e\\\\f;P:p\\;w;;');
  });

  it("omits the password of open networks and flags hidden ones", () => {
    expect(wifiPayload({ ...NETWORK, security: "nopass", hidden: true })).toBe(
      "WIFI:T:nopass;S:Casa;H:true;;",
    );
  });
});

describe("validateWifi", () => {
  it("requires a name, and a password unless the network is open", () => {
    expect(validateWifi(NETWORK)).toBeNull();
    expect(validateWifi({ ...NETWORK, ssid: "  " })).toBe(
      "Enter the network name.",
    );
    expect(validateWifi({ ...NETWORK, password: "" })).toMatch(/password/);
    expect(
      validateWifi({ ...NETWORK, password: "", security: "nopass" }),
    ).toBeNull();
  });
});

describe("qrInfo", () => {
  it("grows with the text and the error correction", () => {
    expect(qrInfo("hi", "L")).toEqual({ version: 1, modules: 21 });
    const long = "x".repeat(200);
    expect(qrInfo(long, "H").version).toBeGreaterThan(
      qrInfo(long, "L").version,
    );
  });

  it("rejects text beyond the largest code", () => {
    expect(() => qrInfo("x".repeat(3000), "L")).toThrow(/too long/);
    // Fits at L (up to 2953 bytes) but not at H (up to 1273).
    expect(qrInfo("x".repeat(2000), "L").version).toBeGreaterThan(30);
    expect(() => qrInfo("x".repeat(2000), "H")).toThrow(/too long/);
  });
});

describe("renderQrSvg", () => {
  it("renders an SVG with the chosen colors", async () => {
    const svg = await renderQrSvg("https://example.com", STYLE);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain("#112233");
    expect(svg).toContain("#ffffff");
  });

  it("reports text that doesn't fit", async () => {
    await expect(renderQrSvg("x".repeat(5000), STYLE)).rejects.toThrow(
      /too long/,
    );
  });
});
