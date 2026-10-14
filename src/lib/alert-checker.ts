import {
  deleteDevice,
  getDevice,
  listAlerts,
  listDeviceIds,
  markTriggered,
} from "./alert-store";
import {
  buildAlertPayload,
  evaluateAlert,
  type PriceAlert,
} from "./alert-utils";
import { sendPush } from "./push-send";
import { getQuote } from "./yahoo-finance";

export interface CheckSummary {
  devices: number;
  checked: number;
  sent: number;
  removedDevices: number;
}

const MAX_SYMBOLS_PER_RUN = 100;

/**
 * Evaluates every active alert once. A triggered alert is delivered to its own
 * device only, then marked as triggered so it does not fire again.
 */
export async function runAlertCheck(): Promise<CheckSummary> {
  const summary: CheckSummary = {
    devices: 0,
    checked: 0,
    sent: 0,
    removedDevices: 0,
  };

  const deviceIds = await listDeviceIds();
  summary.devices = deviceIds.length;

  const active: { deviceId: string; alert: PriceAlert }[] = [];
  for (const deviceId of deviceIds) {
    for (const alert of await listAlerts(deviceId)) {
      if (alert.triggeredAt === null) active.push({ deviceId, alert });
    }
  }
  if (active.length === 0) return summary;

  const symbols = [...new Set(active.map((entry) => entry.alert.symbol))].slice(
    0,
    MAX_SYMBOLS_PER_RUN,
  );
  const settled = await Promise.allSettled(
    [...symbols, "USDBRL=X"].map((symbol) => getQuote(symbol)),
  );
  const quotes = new Map(
    [...symbols, "USDBRL=X"].flatMap((symbol, index) => {
      const result = settled[index];
      return result.status === "fulfilled"
        ? ([[symbol, result.value]] as const)
        : [];
    }),
  );
  const usdBrl = quotes.get("USDBRL=X")?.price ?? null;

  const removed = new Set<string>();
  for (const { deviceId, alert } of active) {
    const quote = quotes.get(alert.symbol);
    if (!quote || removed.has(deviceId)) continue;
    summary.checked++;

    if (evaluateAlert(alert, quote.price, quote.currency, usdBrl) !== true) {
      continue;
    }

    const device = await getDevice(deviceId);
    if (!device) continue;

    const payload = buildAlertPayload(
      alert,
      quote.price,
      quote.currency,
      usdBrl,
      device.label,
    );
    const result = await sendPush(device.subscription, payload);

    if (result === "sent") {
      await markTriggered(deviceId, alert);
      summary.sent++;
    } else if (result === "gone") {
      await deleteDevice(deviceId);
      removed.add(deviceId);
      summary.removedDevices++;
    }
    // "failed": leave the alert active so the next run retries it.
  }

  return summary;
}
