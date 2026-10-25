import QRCode from "qrcode";

/** Error correction: how much of the code can be damaged and still scan. */
export type QrLevel = "L" | "M" | "Q" | "H";

export interface QrStyle {
  level: QrLevel;
  /** "#rrggbb" colors of the modules and of the background. */
  foreground: string;
  background: string;
  /** Quiet zone around the code, in modules (the standard asks for 4). */
  margin: number;
}

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface WifiNetwork {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

const TOO_LONG =
  "This text is too long for a QR code. Shorten it or choose a lower error correction.";

/** Backslash-escapes the characters with a meaning in the Wi-Fi QR format. */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/**
 * The text phones read as "join this network" (the de facto format from
 * the ZXing project, understood by Android and iOS cameras).
 */
export function wifiPayload(network: WifiNetwork): string {
  const parts = [`T:${network.security}`, `S:${escapeWifi(network.ssid)}`];
  if (network.security !== "nopass") {
    parts.push(`P:${escapeWifi(network.password)}`);
  }
  if (network.hidden) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

/** Returns an error message when the network can't be encoded, else null. */
export function validateWifi(network: WifiNetwork): string | null {
  if (network.ssid.trim() === "") return "Enter the network name.";
  if (network.security !== "nopass" && network.password === "") {
    return "Enter the network password, or choose “No password”.";
  }
  return null;
}

/** Size of the code for this text: its version (1–40) and modules per side. */
export function qrInfo(
  text: string,
  level: QrLevel,
): { version: number; modules: number } {
  try {
    const code = QRCode.create(text, { errorCorrectionLevel: level });
    return { version: code.version, modules: code.modules.size };
  } catch {
    throw new Error(TOO_LONG);
  }
}

/** Renders the code as an SVG document that scales to any size. */
export async function renderQrSvg(
  text: string,
  style: QrStyle,
): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: "svg",
      errorCorrectionLevel: style.level,
      margin: style.margin,
      color: { dark: style.foreground, light: style.background },
    });
  } catch {
    throw new Error(TOO_LONG);
  }
}

/** Browser only: renders the code as a PNG data URL, `size` pixels wide. */
export async function renderQrPng(
  text: string,
  style: QrStyle,
  size: number,
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      type: "image/png",
      width: size,
      errorCorrectionLevel: style.level,
      margin: style.margin,
      color: { dark: style.foreground, light: style.background },
    });
  } catch {
    throw new Error(TOO_LONG);
  }
}
