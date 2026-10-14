import webpush from "web-push"
import type { PushPayload, PushSubscriptionData } from "./alert-utils"

export type SendResult = "sent" | "gone" | "failed"

let configured = false

function configure(): boolean {
  if (configured) return true
  const publicKey = process.env.NP_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export function isPushConfigured(): boolean {
  return configure()
}

/** "gone" means the browser revoked the subscription and it should be deleted. */
export async function sendPush(
  subscription: PushSubscriptionData,
  payload: PushPayload,
): Promise<SendResult> {
  if (!configure()) return "failed"
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 60 * 60,
      urgency: "high",
    })
    return "sent"
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return "gone"
    console.error("[push] send failed", status ?? error)
    return "failed"
  }
}
