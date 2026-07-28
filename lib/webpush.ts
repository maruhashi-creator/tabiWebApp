import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

// VAPID is configured lazily so a missing key doesn't crash unrelated routes at import time.
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Send a payload to every subscription a user has; prune subscriptions the push
// service reports as gone (404/410) so dead endpoints don't pile up.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) {
    console.warn("[webpush] VAPID keys not set; skipping push");
    return 0;
  }
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("[webpush] send failed", status, e);
        }
      }
    })
  );
  return sent;
}
