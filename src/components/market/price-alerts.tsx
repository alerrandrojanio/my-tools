"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useI18n } from "@/i18n/provider";
import { useFormatters } from "@/i18n/use-formatters";
import {
  describeDevice,
  type PriceAlert,
  urlBase64ToBytes,
} from "@/lib/alert-utils";
import type { Quote } from "@/lib/market-data";

interface PriceAlertsProps {
  quote: Quote;
}

type Status =
  | "checking"
  | "unsupported"
  | "blocked"
  | "off"
  | "on"
  | "unconfigured";

type Kind = "below" | "above" | "reaches" | "rise" | "fall";

const KINDS: readonly {
  id: Kind;
  label: "kindBelow" | "kindAbove" | "kindReaches" | "kindRise" | "kindFall";
  percent?: boolean;
}[] = [
  { id: "below", label: "kindBelow" },
  { id: "above", label: "kindAbove" },
  { id: "reaches", label: "kindReaches" },
  { id: "rise", label: "kindRise", percent: true },
  { id: "fall", label: "kindFall", percent: true },
];

const DEVICE_KEY = "mytools.alerts.deviceId";
const SUBSCRIBE_TIMEOUT_MS = 20_000;

/** Some browsers never settle `subscribe()` (no push service); don't wait forever. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(new Error("Timed out waiting for the browser push service.")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked; the page still works for this session.
  }
}

function getDeviceId(): string {
  const existing = readStorage(DEVICE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  writeStorage(DEVICE_KEY, created);
  return created;
}

/** The browser cannot reveal the computer's real name, so describe it instead. */
function deviceName(): string {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  return describeDevice(navigator.userAgent, nav.userAgentData?.platform);
}

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const data = (await response.json()) as T & { error?: string };
    return response.ok
      ? { ok: true, data }
      : { ok: false, error: data.error ?? "Something went wrong." };
  } catch {
    return { ok: false, error: "Network error. Check your connection." };
  }
}

/** Rounds a computed price so it reads naturally (e.g. 5.2917 not 5.291700000001). */
function roundPrice(value: number): number {
  return Number(value.toPrecision(8));
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function PriceAlerts({ quote }: PriceAlertsProps) {
  const { t, tError } = useI18n();
  const { formatTarget } = useFormatters();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("checking");
  const [publicKey, setPublicKey] = useState("");
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [kind, setKind] = useState<Kind>("below");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState(quote.currency);

  useEffect(() => {
    setCurrency(quote.currency);
  }, [quote.currency]);

  const loadAlerts = useCallback(async () => {
    const result = await api<{ alerts: PriceAlert[] }>(
      `/api/alerts?deviceId=${encodeURIComponent(getDeviceId())}`,
    );
    setAlerts(result.ok ? result.data.alerts : []);
    return result.ok;
  }, []);

  useEffect(() => {
    async function detect() {
      // The public key comes from the server at runtime (not baked into the build).
      const config = await api<{ publicKey: string }>("/api/alerts/config");
      if (!config.ok || !config.data.publicKey) {
        return setStatus("unconfigured");
      }
      setPublicKey(config.data.publicKey);
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return setStatus("unsupported");
      }
      if (Notification.permission === "denied") return setStatus("blocked");

      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription && (await loadAlerts())) setStatus("on");
      else setStatus("off");
    }
    detect().catch(() => setStatus("unsupported"));
  }, [loadAlerts]);

  // Open/close the native <dialog> (gives focus trapping and Esc for free).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        setMessage(t.alerts.notAllowed);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await withTimeout(
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToBytes(publicKey),
          }),
          SUBSCRIBE_TIMEOUT_MS,
        ));

      const result = await api("/api/alerts/device", {
        method: "POST",
        body: JSON.stringify({
          deviceId: getDeviceId(),
          label: deviceName(),
          subscription: subscription.toJSON(),
        }),
      });
      if (!result.ok) {
        setMessage(tError(result.error));
        return;
      }
      await loadAlerts();
      setStatus("on");
      setMessage(t.alerts.nowOn);
    } catch {
      setMessage(t.alerts.enableFailed);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      await api("/api/alerts/device", {
        method: "DELETE",
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      const registration = await navigator.serviceWorker.getRegistration("/");
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
      setAlerts([]);
      setStatus("off");
      setMessage(t.alerts.nowOff);
    } catch {
      setMessage(t.alerts.disableFailed);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    const result = await api("/api/alerts/test", {
      method: "POST",
      body: JSON.stringify({ deviceId: getDeviceId() }),
    });
    setMessage(result.ok ? t.alerts.testSent : tError(result.error));
    setBusy(false);
  }

  const kindConfig = KINDS.find((entry) => entry.id === kind) ?? KINDS[0];
  const number = Number(value.replace(",", "."));
  const validNumber =
    value.trim() !== "" && Number.isFinite(number) && number > 0;

  /** What will be saved, plus a plain-language preview of it. */
  function buildAlert(): {
    condition: "above" | "below" | "reaches";
    target: number;
    currency: string;
  } | null {
    if (!validNumber) return null;
    if (kindConfig.percent) {
      const factor = kind === "rise" ? 1 + number / 100 : 1 - number / 100;
      if (factor <= 0) return null;
      return {
        condition: kind === "rise" ? "above" : "below",
        target: roundPrice(quote.price * factor),
        currency: quote.currency,
      };
    }
    return {
      condition: kind as "above" | "below" | "reaches",
      target: number,
      currency,
    };
  }

  const planned = buildAlert();
  const preview = planned
    ? (planned.condition === "above"
        ? t.alerts.previewAbove
        : planned.condition === "below"
          ? t.alerts.previewBelow
          : t.alerts.previewReaches)(
        quote.name,
        formatTarget(planned.target, planned.currency),
      )
    : "";

  async function addAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!planned) return;
    setBusy(true);
    setMessage("");
    const result = await api("/api/alerts", {
      method: "POST",
      body: JSON.stringify({
        deviceId: getDeviceId(),
        alert: {
          symbol: quote.symbol,
          name: quote.name,
          ...planned,
        },
      }),
    });
    if (result.ok) {
      setValue("");
      setMessage(t.alerts.created);
      await loadAlerts();
    } else {
      setMessage(tError(result.error));
    }
    setBusy(false);
  }

  async function removeAlert(id: string) {
    const result = await api(
      `/api/alerts?deviceId=${encodeURIComponent(getDeviceId())}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (result.ok) await loadAlerts();
    else setMessage(tError(result.error));
  }

  const forThisAsset = alerts.filter((alert) => alert.symbol === quote.symbol);
  const others = alerts.filter((alert) => alert.symbol !== quote.symbol);
  const activeHere = forThisAsset.filter((alert) => alert.triggeredAt === null);
  const currencies = [...new Set([quote.currency, "USD", "BRL"])];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage("");
          setOpen(true);
          if (status === "on") void loadAlerts();
        }}
        aria-label={
          activeHere.length > 0
            ? t.alerts.buttonActive(quote.name, activeHere.length)
            : t.alerts.buttonCreate(quote.name)
        }
        title={t.alerts.buttonTitle}
        className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-line-strong text-ink transition hover:bg-surface-hover"
      >
        <BellIcon />
        {activeHere.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-white"
          >
            {activeHere.length}
          </span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="alerts-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // A click on the dimmed backdrop (the dialog element itself) closes it.
          if (event.target === event.currentTarget) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-line-strong bg-surface p-0 text-ink backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-5 p-[clamp(16px,3vw,24px)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="alerts-title" className="text-xl font-bold">
                {t.alerts.title}
              </h3>
              <p className="truncate text-sm text-muted">
                {t.alerts.now(
                  quote.name,
                  formatTarget(quote.price, quote.currency),
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.alerts.close}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-line-strong text-lg text-muted transition hover:bg-surface-hover hover:text-ink"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          {status === "checking" && (
            <p className="text-sm text-muted">{t.alerts.checking}</p>
          )}
          {status === "unconfigured" && (
            <p className="text-sm text-muted">{t.alerts.unconfigured}</p>
          )}
          {status === "unsupported" && (
            <p className="text-sm text-muted">{t.alerts.unsupported}</p>
          )}
          {status === "blocked" && (
            <p className="text-sm text-danger">{t.alerts.blocked}</p>
          )}

          {status === "off" && (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] text-muted">{t.alerts.intro}</p>
              <div>
                <button
                  type="button"
                  onClick={enable}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? t.alerts.turningOn : t.alerts.turnOn}
                </button>
              </div>
            </div>
          )}

          {status === "on" && (
            <>
              <form onSubmit={addAlert} className="flex flex-col gap-4">
                <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                  <legend className="mb-1 text-sm font-semibold">
                    {t.alerts.notifyWhen}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {KINDS.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={kind === id}
                        onClick={() => setKind(id)}
                        className={`inline-flex min-h-11 items-center rounded-[10px] px-3.5 text-[15px] font-semibold transition ${
                          kind === id
                            ? "bg-accent text-white"
                            : "border border-line-strong text-muted hover:bg-surface-hover hover:text-ink"
                        }`}
                      >
                        {t.alerts[label]}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="alert-value"
                      className="text-sm font-semibold"
                    >
                      {kindConfig.percent ? t.alerts.percent : t.alerts.value}
                    </label>
                    <input
                      id="alert-value"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      placeholder={kindConfig.percent ? "5" : "0.00"}
                      className="h-11 w-36 rounded-xl border border-line-strong bg-canvas px-3 font-mono text-[15px] text-ink placeholder:text-muted"
                    />
                  </div>

                  {kindConfig.percent ? (
                    <span className="pb-2.5 text-[15px] text-muted">
                      {t.alerts.fromNow}
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="alert-currency"
                        className="text-sm font-semibold"
                      >
                        {t.alerts.currency}
                      </label>
                      <select
                        id="alert-currency"
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        className="h-11 rounded-xl border border-line-strong bg-canvas px-3 text-[15px] text-ink"
                      >
                        {currencies.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <p className="min-h-5 text-sm text-muted">{preview}</p>

                <div>
                  <button
                    type="submit"
                    disabled={busy || planned === null}
                    className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.alerts.create}
                  </button>
                </div>
              </form>

              <AlertList
                title={t.alerts.forAsset(quote.name)}
                alerts={forThisAsset}
                onRemove={removeAlert}
              />
              <AlertList
                title={t.alerts.otherAssets}
                alerts={others}
                onRemove={removeAlert}
              />

              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:opacity-50"
                >
                  {t.alerts.sendTest}
                </button>
                <button
                  type="button"
                  onClick={disable}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4 text-[15px] font-semibold text-muted transition hover:bg-surface-hover hover:text-ink disabled:opacity-50"
                >
                  {t.alerts.turnOff}
                </button>
              </div>
            </>
          )}

          <output className="block min-h-5 text-sm text-muted">
            {message}
          </output>
        </div>
      </dialog>
    </>
  );
}

function describe(
  alert: PriceAlert,
  reaches: string,
  format: (target: number, currency: string) => string,
): string {
  const verb =
    alert.condition === "above"
      ? "≥"
      : alert.condition === "below"
        ? "≤"
        : reaches;
  return `${verb} ${format(alert.target, alert.currency)}`;
}

function AlertList({
  title,
  alerts,
  onRemove,
}: {
  title: string;
  alerts: PriceAlert[];
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const { formatTarget } = useFormatters();
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold text-muted">{title}</h4>
      <ul className="flex flex-col gap-2">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-strong bg-canvas px-3 py-2"
          >
            <span className="min-w-0 text-[15px]">
              <span className="font-semibold">{alert.name}</span>{" "}
              <span className="font-mono">
                {describe(alert, t.alerts.reaches, formatTarget)}
              </span>{" "}
              <span
                className={
                  alert.triggeredAt === null ? "text-up" : "text-muted"
                }
              >
                ·{" "}
                {alert.triggeredAt === null
                  ? t.alerts.active
                  : t.alerts.triggered}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onRemove(alert.id)}
              aria-label={t.alerts.removeLabel(alert.name)}
              className="inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-3 text-sm font-semibold text-ink transition hover:bg-surface-hover"
            >
              {t.common.remove}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
