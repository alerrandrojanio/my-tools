import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  botUsername,
  buildStartLink,
  buildTelegramText,
  isTelegramConfigured,
  isValidLinkToken,
  parseStartCommand,
  privateChatId,
  sendTelegramMessage,
} from "./telegram";

const TOKEN = "a".repeat(32);
const update = (text: string, type = "private", id = 42) => ({
  update_id: 1,
  message: { text, chat: { id, type }, from: { language_code: "pt-br" } },
});

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:abc");
  vi.stubEnv("TELEGRAM_BOT_USERNAME", "@MyToolsBot");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("configuration", () => {
  it("needs both the token and the username", () => {
    expect(isTelegramConfigured()).toBe(true);
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "");
    expect(isTelegramConfigured()).toBe(false);
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "x");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    expect(isTelegramConfigured()).toBe(false);
  });

  it("strips the @ from the username and builds the start link", () => {
    expect(botUsername()).toBe("MyToolsBot");
    expect(buildStartLink("MyToolsBot", TOKEN)).toBe(
      `https://t.me/MyToolsBot?start=${TOKEN}`,
    );
  });
});

describe("parseStartCommand", () => {
  it("reads /start with a token in a private chat", () => {
    expect(parseStartCommand(update(`/start ${TOKEN}`))).toEqual({
      chatId: 42,
      linkToken: TOKEN,
    });
    expect(parseStartCommand(update(`/start@MyToolsBot ${TOKEN}`))).toEqual({
      chatId: 42,
      linkToken: TOKEN,
    });
  });

  it.each([
    "/start",
    "hello",
    "/start short",
    `/start ${TOKEN} extra`,
    "/start ../../etc/passwd!!",
  ])("ignores %j", (text) => {
    expect(parseStartCommand(update(text))).toBeNull();
  });

  it("ignores groups and channels", () => {
    expect(parseStartCommand(update(`/start ${TOKEN}`, "group"))).toBeNull();
    expect(parseStartCommand(update(`/start ${TOKEN}`, "channel"))).toBeNull();
  });

  it("ignores malformed updates", () => {
    expect(parseStartCommand(null)).toBeNull();
    expect(parseStartCommand({})).toBeNull();
    expect(parseStartCommand({ message: { text: 5, chat: {} } })).toBeNull();
  });

  it("validates tokens", () => {
    expect(isValidLinkToken(TOKEN)).toBe(true);
    expect(isValidLinkToken("abc")).toBe(false);
    expect(isValidLinkToken(42)).toBe(false);
  });

  it("finds the chat of any private message", () => {
    expect(privateChatId(update("hi"))).toBe(42);
    expect(privateChatId(update("hi", "group"))).toBeNull();
    expect(privateChatId(null)).toBeNull();
  });
});

describe("buildTelegramText", () => {
  const payload = {
    title: "Apple rose above $350.00",
    body: "Now $351.20 · Windows · Chrome",
    url: "/tools/market-quotes?symbol=AAPL",
    tag: "alert-1",
  };

  it("includes title, body and an absolute link", () => {
    expect(buildTelegramText(payload, "https://site.test")).toBe(
      "🔔 Apple rose above $350.00\nNow $351.20 · Windows · Chrome\nhttps://site.test/tools/market-quotes?symbol=AAPL",
    );
  });

  it("omits the link when the site address is unknown", () => {
    expect(buildTelegramText(payload, null)).not.toContain("http");
  });
});

describe("sendTelegramMessage", () => {
  function mockFetch(status: number, body: unknown = {}) {
    return vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(body), { status }));
  }

  it("posts the message to the bot API", async () => {
    const fetchMock = mockFetch(200, { ok: true });
    expect(await sendTelegramMessage(42, "hello")).toBe("sent");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      chat_id: 42,
      text: "hello",
    });
  });

  it("reports 'gone' when the user blocked the bot or deleted the chat", async () => {
    mockFetch(403, { description: "Forbidden: bot was blocked by the user" });
    expect(await sendTelegramMessage(42, "x")).toBe("gone");
    mockFetch(400, { description: "Bad Request: chat not found" });
    expect(await sendTelegramMessage(42, "x")).toBe("gone");
  });

  it("reports 'failed' on other errors, so the alert is retried", async () => {
    mockFetch(429, { description: "Too Many Requests" });
    expect(await sendTelegramMessage(42, "x")).toBe("failed");
    mockFetch(400, { description: "Bad Request: message is too long" });
    expect(await sendTelegramMessage(42, "x")).toBe("failed");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    expect(await sendTelegramMessage(42, "x")).toBe("failed");
  });

  it("does nothing without a token", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const fetchMock = mockFetch(200);
    expect(await sendTelegramMessage(42, "x")).toBe("failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
