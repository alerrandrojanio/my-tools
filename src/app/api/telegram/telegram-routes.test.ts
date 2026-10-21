import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  POST as linkPOST,
  GET as statusGET,
  DELETE as unlinkDELETE,
} from "@/app/api/alerts/telegram/route";
import { getTelegramChat, saveDevice } from "@/lib/alert-store";
import { sendTelegramMessage, setWebhook } from "@/lib/telegram";
import { fakeRedis } from "@/test/fake-redis";
import { POST as setupPOST } from "./setup/route";
import { POST as webhookPOST } from "./webhook/route";

vi.mock("@/lib/redis-connection", async () => {
  const { fakeRedis } = await import("@/test/fake-redis");
  return { redisConnection: { getClient: async () => fakeRedis } };
});
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));
vi.mock("@/lib/telegram", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/telegram")>();
  return {
    ...actual,
    sendTelegramMessage: vi.fn(async () => "sent"),
    setWebhook: vi.fn(async () => ({ ok: true })),
  };
});

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const SECRET = "webhook_secret_1234567890";
const SUB = {
  endpoint: "https://fcm.googleapis.com/fcm/send/x",
  keys: { p256dh: "k", auth: "a" },
};

const status = (deviceId: string) =>
  statusGET(
    new Request(`https://site.test/api/alerts/telegram?deviceId=${deviceId}`),
  );

async function createLink(deviceId: string): Promise<string> {
  const response = await linkPOST(
    new Request("https://site.test/api/alerts/telegram", {
      method: "POST",
      body: JSON.stringify({ deviceId }),
    }),
  );
  const { url } = await response.json();
  return new URL(url).searchParams.get("start") ?? "";
}

function telegramUpdate(text: string, chatId = 777, headers?: HeadersInit) {
  return webhookPOST(
    new Request("https://site.test/api/telegram/webhook", {
      method: "POST",
      headers: headers ?? { "x-telegram-bot-api-secret-token": SECRET },
      body: JSON.stringify({
        update_id: 1,
        message: {
          text,
          chat: { id: chatId, type: "private" },
          from: { language_code: "pt-br" },
        },
      }),
    }),
  );
}

beforeEach(async () => {
  fakeRedis.reset();
  vi.mocked(sendTelegramMessage).mockClear();
  vi.mocked(setWebhook).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:abc");
  vi.stubEnv("TELEGRAM_BOT_USERNAME", "MyToolsBot");
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("CRON_SECRET", "cron-secret");
  await saveDevice(ME, "Windows · Chrome", SUB);
  await saveDevice(OTHER, "Windows · Edge", SUB);
});

describe("linking a device to Telegram", () => {
  it("full flow: link → /start in Telegram → linked", async () => {
    expect(await (await status(ME)).json()).toEqual({
      configured: true,
      linked: false,
    });

    const token = await createLink(ME);
    expect(token).toMatch(/^[a-f0-9]{32}$/);

    expect((await telegramUpdate(`/start ${token}`)).status).toBe(200);
    expect(await getTelegramChat(ME)).toBe(777);
    expect(await (await status(ME)).json()).toEqual({
      configured: true,
      linked: true,
    });
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      777,
      expect.stringContaining("Conectado"),
    );
  });

  it("links only the device that created the token", async () => {
    const token = await createLink(ME);
    await telegramUpdate(`/start ${token}`);
    expect(await getTelegramChat(ME)).toBe(777);
    expect(await getTelegramChat(OTHER)).toBeNull();
  });

  it("tokens work once", async () => {
    const token = await createLink(ME);
    await telegramUpdate(`/start ${token}`, 777);
    await telegramUpdate(`/start ${token}`, 999);
    expect(await getTelegramChat(ME)).toBe(777);
    expect(sendTelegramMessage).toHaveBeenLastCalledWith(
      999,
      expect.stringContaining("expirou"),
    );
  });

  it("rejects calls that do not carry Telegram's secret", async () => {
    const token = await createLink(ME);
    const forged = await telegramUpdate(`/start ${token}`, 666, {
      "x-telegram-bot-api-secret-token": "wrong",
    });
    expect(forged.status).toBe(401);
    expect(await getTelegramChat(ME)).toBeNull();
    expect((await telegramUpdate(`/start ${token}`, 666, {})).status).toBe(401);
  });

  it("answers other messages with instructions", async () => {
    expect((await telegramUpdate("oi")).status).toBe(200);
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      777,
      expect.stringContaining("sino"),
    );
  });

  it("refuses unregistered devices and unlinks on request", async () => {
    const unknown = "33333333-3333-3333-3333-333333333333";
    expect((await status(unknown)).status).toBe(404);

    const token = await createLink(ME);
    await telegramUpdate(`/start ${token}`);
    const response = await unlinkDELETE(
      new Request(`https://site.test/api/alerts/telegram?deviceId=${ME}`, {
        method: "DELETE",
      }),
    );
    expect(response.status).toBe(200);
    expect(await getTelegramChat(ME)).toBeNull();
  });

  it("reports not configured when the bot is missing", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    expect(await (await status(ME)).json()).toEqual({
      configured: false,
      linked: false,
    });
    const response = await linkPOST(
      new Request("https://site.test/api/alerts/telegram", {
        method: "POST",
        body: JSON.stringify({ deviceId: ME }),
      }),
    );
    expect(response.status).toBe(503);
  });
});

describe("POST /api/telegram/setup", () => {
  const call = (auth?: string) =>
    setupPOST(
      new Request("https://site.test/api/telegram/setup", {
        method: "POST",
        headers: auth ? { authorization: auth } : {},
      }),
    );

  it("requires the CRON_SECRET", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect(setWebhook).not.toHaveBeenCalled();
  });

  it("registers the webhook on this site with the secret", async () => {
    const response = await call("Bearer cron-secret");
    expect(response.status).toBe(200);
    expect(setWebhook).toHaveBeenCalledWith(
      "https://site.test/api/telegram/webhook",
      SECRET,
    );
  });

  it("refuses a weak webhook secret", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "short");
    expect((await call("Bearer cron-secret")).status).toBe(503);
  });
});
