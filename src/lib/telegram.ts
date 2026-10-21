import type { PushPayload } from "./alert-utils";

export type TelegramResult = "sent" | "gone" | "failed";

const API = "https://api.telegram.org";
const LINK_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

function token(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN || undefined;
}

export function isTelegramConfigured(): boolean {
  return Boolean(token() && process.env.TELEGRAM_BOT_USERNAME);
}

/** The bot's @username without the "@", used to build t.me links. */
export function botUsername(): string | null {
  const name = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim();
  return name || null;
}

/** Deep link that opens the bot and sends "/start <token>" when the user taps Start. */
export function buildStartLink(username: string, linkToken: string): string {
  return `https://t.me/${encodeURIComponent(username)}?start=${encodeURIComponent(linkToken)}`;
}

export function isValidLinkToken(value: unknown): value is string {
  return typeof value === "string" && LINK_TOKEN_PATTERN.test(value);
}

export interface StartCommand {
  chatId: number;
  linkToken: string;
}

/**
 * Extracts "/start <token>" from a Telegram update. Only private chats count:
 * alerts are personal and must not be linked to a group.
 */
export function parseStartCommand(update: unknown): StartCommand | null {
  if (typeof update !== "object" || update === null) return null;
  const message = (update as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) return null;

  const { text, chat } = message as { text?: unknown; chat?: unknown };
  if (typeof text !== "string" || typeof chat !== "object" || chat === null) {
    return null;
  }
  const { id, type } = chat as { id?: unknown; type?: unknown };
  if (typeof id !== "number" || type !== "private") return null;

  const match = /^\/start(?:@\w+)?\s+(\S+)\s*$/.exec(text.trim());
  if (!match || !isValidLinkToken(match[1])) return null;
  return { chatId: id, linkToken: match[1] };
}

/** Chat id of any private message, used to answer users who did not come from the site. */
export function privateChatId(update: unknown): number | null {
  const chat = (
    update as { message?: { chat?: { id?: unknown; type?: unknown } } }
  )?.message?.chat;
  return chat && typeof chat.id === "number" && chat.type === "private"
    ? chat.id
    : null;
}

/** Plain-text message for an alert (no Markdown, so names can't break formatting). */
export function buildTelegramText(
  payload: PushPayload,
  origin: string | null,
): string {
  const lines = [`🔔 ${payload.title}`, payload.body];
  if (origin) lines.push(new URL(payload.url, origin).toString());
  return lines.join("\n");
}

/**
 * Sends a message. "gone" means the user blocked the bot or deleted the chat,
 * so the link should be removed.
 */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
): Promise<TelegramResult> {
  const botToken = token();
  if (!botToken) return "failed";

  try {
    const response = await fetch(`${API}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return "sent";
    // 403: bot blocked; 400 "chat not found": chat deleted.
    if (response.status === 403) return "gone";
    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as {
        description?: string;
      } | null;
      if (/chat not found/i.test(body?.description ?? "")) return "gone";
    }
    console.error("[telegram] send failed", response.status);
    return "failed";
  } catch (error) {
    console.error("[telegram] send failed", error);
    return "failed";
  }
}

/** Points the bot's webhook at this site. Run once after deploying. */
export async function setWebhook(
  url: string,
  secret: string,
): Promise<{ ok: boolean; description?: string }> {
  const botToken = token();
  if (!botToken)
    return { ok: false, description: "TELEGRAM_BOT_TOKEN is not set." };
  const response = await fetch(`${API}/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  return (await response.json()) as { ok: boolean; description?: string };
}
