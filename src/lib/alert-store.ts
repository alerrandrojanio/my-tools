import {
  type AlertInput,
  MAX_ALERTS_PER_DEVICE,
  type PriceAlert,
  type PushSubscriptionData,
} from "./alert-utils";
import { redisConnection } from "./redis-connection";

export interface Device {
  label: string;
  subscription: PushSubscriptionData;
  createdAt: number;
}

const DEVICES_SET = "alerts:devices";
const deviceKey = (id: string) => `alerts:device:${id}`;
const itemsKey = (id: string) => `alerts:items:${id}`;

export async function saveDevice(
  deviceId: string,
  label: string,
  subscription: PushSubscriptionData,
): Promise<void> {
  const client = await redisConnection.getClient();
  const device: Device = { label, subscription, createdAt: Date.now() };
  await client.set(deviceKey(deviceId), JSON.stringify(device));
  await client.sAdd(DEVICES_SET, deviceId);
}

export async function getDevice(deviceId: string): Promise<Device | null> {
  const client = await redisConnection.getClient();
  const raw = await client.get(deviceKey(deviceId));
  return raw ? (JSON.parse(raw) as Device) : null;
}

/** Removes the device, its subscription, its Telegram link and all of its alerts. */
export async function deleteDevice(deviceId: string): Promise<void> {
  const client = await redisConnection.getClient();
  await client.del([
    deviceKey(deviceId),
    itemsKey(deviceId),
    telegramKey(deviceId),
  ]);
  await client.sRem(DEVICES_SET, deviceId);
}

// ---- Telegram ----

const telegramKey = (id: string) => `alerts:telegram:${id}`;
const linkTokenKey = (token: string) => `alerts:tglink:${token}`;
/** A link from the site to the bot is valid for 15 minutes. */
const LINK_TOKEN_TTL_SECONDS = 15 * 60;

/** One-time token that ties a "/start <token>" in Telegram to this device. */
export async function createTelegramLinkToken(
  deviceId: string,
): Promise<string> {
  const client = await redisConnection.getClient();
  const token = crypto.randomUUID().replace(/-/g, "");
  await client.set(linkTokenKey(token), deviceId, {
    EX: LINK_TOKEN_TTL_SECONDS,
  });
  return token;
}

/** Returns the device the token was issued for and invalidates the token. */
export async function consumeTelegramLinkToken(
  token: string,
): Promise<string | null> {
  const client = await redisConnection.getClient();
  const deviceId = await client.get(linkTokenKey(token));
  if (deviceId) await client.del([linkTokenKey(token)]);
  return deviceId;
}

export async function setTelegramChat(
  deviceId: string,
  chatId: number,
): Promise<void> {
  const client = await redisConnection.getClient();
  await client.set(telegramKey(deviceId), String(chatId));
}

export async function getTelegramChat(
  deviceId: string,
): Promise<number | null> {
  const client = await redisConnection.getClient();
  const raw = await client.get(telegramKey(deviceId));
  const chatId = raw === null ? Number.NaN : Number(raw);
  return Number.isSafeInteger(chatId) ? chatId : null;
}

export async function removeTelegramChat(deviceId: string): Promise<void> {
  const client = await redisConnection.getClient();
  await client.del([telegramKey(deviceId)]);
}

export async function listAlerts(deviceId: string): Promise<PriceAlert[]> {
  const client = await redisConnection.getClient();
  const all = await client.hGetAll(itemsKey(deviceId));
  return Object.values(all)
    .map((raw) => JSON.parse(raw) as PriceAlert)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export class AlertLimitError extends Error {}

export async function addAlert(
  deviceId: string,
  input: AlertInput,
  from: number | null = null,
): Promise<PriceAlert> {
  const client = await redisConnection.getClient();
  const count = await client.hLen(itemsKey(deviceId));
  if (count >= MAX_ALERTS_PER_DEVICE) {
    throw new AlertLimitError(
      `You can have up to ${MAX_ALERTS_PER_DEVICE} alerts on one device.`,
    );
  }
  const alert: PriceAlert = {
    ...input,
    from,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    triggeredAt: null,
  };
  await client.hSet(itemsKey(deviceId), alert.id, JSON.stringify(alert));
  return alert;
}

export async function removeAlert(
  deviceId: string,
  alertId: string,
): Promise<boolean> {
  const client = await redisConnection.getClient();
  return (await client.hDel(itemsKey(deviceId), alertId)) > 0;
}

export async function markTriggered(
  deviceId: string,
  alert: PriceAlert,
): Promise<void> {
  const client = await redisConnection.getClient();
  const updated: PriceAlert = { ...alert, triggeredAt: Date.now() };
  await client.hSet(itemsKey(deviceId), alert.id, JSON.stringify(updated));
}

export async function listDeviceIds(): Promise<string[]> {
  const client = await redisConnection.getClient();
  return client.sMembers(DEVICES_SET);
}
