import { convertAmount } from "./currency-convert";
import { isValidSymbol } from "./market-data";

/** "reaches" fires when the price touches the target from either side. */
export type AlertCondition = "above" | "below" | "reaches";

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  condition: AlertCondition;
  /** Target price, expressed in `currency`. */
  target: number;
  /** Currency the target was typed in (3-letter code). */
  currency: string;
  /** Price (in `currency`) when the alert was created; used by "reaches". */
  from: number | null;
  createdAt: number;
  /** Set once the notification was delivered; the alert is then inactive. */
  triggeredAt: number | null;
}

export const MAX_ALERTS_PER_DEVICE = 20;
export const MAX_LABEL_LENGTH = 40;

const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
/** Push services of Chrome/Opera/Brave (Google), Firefox, Edge (Windows) and Safari. */
const PUSH_HOSTS = [
  "googleapis.com",
  "google.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
];
const MAX_ENDPOINT_LENGTH = 4096;

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function isValidDeviceId(value: unknown): value is string {
  return typeof value === "string" && DEVICE_ID_PATTERN.test(value);
}

export function cleanLabel(value: unknown): string {
  if (typeof value !== "string") return "";
  // Strip control characters and collapse whitespace.
  const text = [...value]
    .filter((char) => char.charCodeAt(0) >= 0x20)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, MAX_LABEL_LENGTH);
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Accepts only subscriptions from the browsers' own push services, so the
 * server can never be made to POST to an arbitrary address.
 */
export function validateSubscription(
  value: unknown,
): Validated<PushSubscriptionData> {
  const bad = (reason: string) =>
    ({ ok: false, error: `Invalid push subscription: ${reason}.` }) as const;
  if (typeof value !== "object" || value === null) return bad("missing data");
  const { endpoint, keys } = value as Record<string, unknown>;
  if (typeof endpoint !== "string") return bad("missing endpoint");
  if (endpoint.length > MAX_ENDPOINT_LENGTH) return bad("endpoint too long");
  if (typeof keys !== "object" || keys === null) return bad("missing keys");
  const { p256dh, auth } = keys as Record<string, unknown>;
  if (typeof p256dh !== "string" || typeof auth !== "string") {
    return bad("missing keys");
  }
  if (p256dh.length > 256 || auth.length > 128) return bad("keys too long");

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return bad("endpoint is not a URL");
  }
  if (url.protocol !== "https:") return bad("endpoint is not https");
  const allowed = PUSH_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );
  if (!allowed) return bad(`unknown push service ${url.hostname}`);

  return { ok: true, value: { endpoint, keys: { p256dh, auth } } };
}

export interface AlertInput {
  symbol: string;
  name: string;
  condition: AlertCondition;
  target: number;
  currency: string;
}

export function validateAlertInput(value: unknown): Validated<AlertInput> {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Invalid alert." };
  }
  const { symbol, name, condition, target, currency } = value as Record<
    string,
    unknown
  >;

  if (typeof symbol !== "string" || !isValidSymbol(symbol)) {
    return { ok: false, error: "Invalid symbol." };
  }
  if (
    condition !== "above" &&
    condition !== "below" &&
    condition !== "reaches"
  ) {
    return { ok: false, error: "Choose when you want to be notified." };
  }
  if (
    typeof target !== "number" ||
    !Number.isFinite(target) ||
    target <= 0 ||
    target > 1e12
  ) {
    return { ok: false, error: "Enter a target price greater than zero." };
  }
  if (typeof currency !== "string" || !CURRENCY_PATTERN.test(currency)) {
    return { ok: false, error: "Invalid currency." };
  }

  return {
    ok: true,
    value: {
      symbol,
      name: cleanLabel(name) || symbol,
      condition,
      target,
      currency,
    },
  };
}

/**
 * Whether the alert's condition holds for a price quoted in `quoteCurrency`.
 * Returns null when the price cannot be compared (unsupported conversion).
 */
export function evaluateAlert(
  alert: Pick<PriceAlert, "condition" | "target" | "currency" | "from">,
  price: number,
  quoteCurrency: string,
  usdBrl: number | null,
): boolean | null {
  const converted = convertAmount(price, quoteCurrency, alert.currency, usdBrl);
  if (converted === null) return null;
  if (alert.condition === "above") return converted >= alert.target;
  if (alert.condition === "below") return converted <= alert.target;

  // "reaches": crossing or touching the target from the side it started on.
  if (alert.from === null) return null;
  if (alert.from < alert.target) return converted >= alert.target;
  if (alert.from > alert.target) return converted <= alert.target;
  return Math.abs(converted - alert.target) <= alert.target * 0.0005;
}

export function formatTarget(
  target: number,
  currency: string,
  locale = "en-US",
): string {
  const decimals = target >= 1 ? 2 : 4;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(target);
  } catch {
    return `${target.toFixed(decimals)} ${currency}`;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export function buildAlertPayload(
  alert: PriceAlert,
  currentPrice: number,
  quoteCurrency: string,
  usdBrl: number | null,
  deviceLabel: string,
): PushPayload {
  const converted = convertAmount(
    currentPrice,
    quoteCurrency,
    alert.currency,
    usdBrl,
  );
  const shown = converted ?? currentPrice;
  const currency = converted === null ? quoteCurrency : alert.currency;
  const verb =
    alert.condition === "above"
      ? "rose above"
      : alert.condition === "below"
        ? "fell below"
        : "reached";
  return {
    title: `${alert.name} ${verb} ${formatTarget(alert.target, alert.currency)}`,
    body: `Now ${formatTarget(shown, currency)}${deviceLabel ? ` · ${deviceLabel}` : ""}`,
    url: `/tools/market-quotes?symbol=${encodeURIComponent(alert.symbol)}`,
    tag: `alert-${alert.id}`,
  };
}

/** Decodes a URL-safe Base64 VAPID key into the bytes `subscribe` expects. */
export function urlBase64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Short device name from the user agent, e.g. "Windows · Chrome". */
export function describeDevice(
  userAgent: string,
  platformHint?: string,
): string {
  const os =
    /Windows/i.test(platformHint ?? "") || /Windows/i.test(userAgent)
      ? "Windows"
      : /Android/i.test(userAgent)
        ? "Android"
        : /iPhone|iPad|iOS/i.test(userAgent)
          ? "iOS"
          : /Mac/i.test(platformHint ?? "") || /Mac OS X/i.test(userAgent)
            ? "macOS"
            : /Linux/i.test(userAgent)
              ? "Linux"
              : "";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "";
  return [os, browser].filter(Boolean).join(" · ");
}
