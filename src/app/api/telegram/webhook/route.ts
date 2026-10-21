import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  consumeTelegramLinkToken,
  getDevice,
  setTelegramChat,
} from "@/lib/alert-store";
import {
  parseStartCommand,
  privateChatId,
  sendTelegramMessage,
} from "@/lib/telegram";

const REPLIES = {
  linked: {
    en: "✅ Connected! Your price alerts from My Tools will also arrive here.",
    pt: "✅ Conectado! Seus alertas de preço do My Tools também vão chegar aqui.",
  },
  expired: {
    en: "This link has expired. Open the alert window on the site and tap “Notify me on Telegram” again.",
    pt: "Este link expirou. Abra a janela de alertas no site e toque em “Avisar também no Telegram” de novo.",
  },
  hello: {
    en: "Hi! To receive price alerts here, open the bell on the My Tools market page and choose “Notify me on Telegram”.",
    pt: "Olá! Para receber alertas de preço aqui, abra o sino na página de cotações do My Tools e escolha “Avisar também no Telegram”.",
  },
} as const;

/** Telegram sends the secret configured in setWebhook in this header. */
function isFromTelegram(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return false;
  const given = Buffer.from(
    request.headers.get("x-telegram-bot-api-secret-token") ?? "",
  );
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function languageOf(update: unknown): "en" | "pt" {
  const code = (update as { message?: { from?: { language_code?: unknown } } })
    ?.message?.from?.language_code;
  return typeof code === "string" && code.toLowerCase().startsWith("pt")
    ? "pt"
    : "en";
}

/**
 * Receives messages sent to the bot. Always answers 200 so Telegram does not
 * keep retrying; problems are logged instead.
 */
export async function POST(request: Request) {
  if (!isFromTelegram(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const lang = languageOf(update);
  try {
    const start = parseStartCommand(update);
    if (start) {
      const deviceId = await consumeTelegramLinkToken(start.linkToken);
      if (deviceId && (await getDevice(deviceId))) {
        await setTelegramChat(deviceId, start.chatId);
        await sendTelegramMessage(start.chatId, REPLIES.linked[lang]);
      } else {
        await sendTelegramMessage(start.chatId, REPLIES.expired[lang]);
      }
      return NextResponse.json({ ok: true });
    }

    const chatId = privateChatId(update);
    if (chatId !== null) await sendTelegramMessage(chatId, REPLIES.hello[lang]);
  } catch (error) {
    console.error("[telegram] webhook", error);
  }
  return NextResponse.json({ ok: true });
}
