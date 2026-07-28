export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SubBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as SubBody;
  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "購読情報が不正だよ" }, { status: 400 });
  }

  // endpoint is unique; re-subscribing on the same device re-points it to this user.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, userId: session.user.id },
    update: { p256dh, auth, userId: session.user.id },
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as SubBody;
  if (!body.endpoint) return Response.json({ error: "購読情報が不正だよ" }, { status: 400 });

  // Only remove the caller's own subscription for this endpoint.
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: body.endpoint, userId: session.user.id },
  });
  return Response.json({ ok: true });
}
