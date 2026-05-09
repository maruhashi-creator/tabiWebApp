export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { guardCatOwnership } from "@/lib/cat-auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const catId = searchParams.get("catId");

  const guard = await guardCatOwnership(catId, session.user.id);
  if (guard) return guard;

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = { catId: catId! };
  if (date) {
    where.loggedAt = {
      gte: new Date(`${date}T00:00:00.000+09:00`),
      lte: new Date(`${date}T23:59:59.999+09:00`),
    };
  } else if (from && to) {
    where.loggedAt = {
      gte: new Date(`${from}T00:00:00.000+09:00`),
      lte: new Date(`${to}T23:59:59.999+09:00`),
    };
  }

  const logs = await prisma.toiletLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { loggedAt: "desc" },
  });
  return Response.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { catId, type, count, condition, loggedAt } = body as {
    catId: string;
    type: "URINE" | "FECES";
    count: number;
    condition?: string;
    loggedAt: string;
  };

  if (!catId || !type || !loggedAt) {
    return Response.json({ error: "catId, type, loggedAt は必須です" }, { status: 400 });
  }

  const guard = await guardCatOwnership(catId, session.user.id);
  if (guard) return guard;

  const log = await prisma.toiletLog.create({
    data: {
      catId,
      userId: session.user.id,
      type,
      count: count ?? 1,
      condition,
      loggedAt: new Date(loggedAt),
    },
    include: { user: { select: { name: true } } },
  });
  return Response.json(log, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  await prisma.toiletLog.delete({ where: { id, userId: session.user.id } });
  return Response.json({ ok: true });
}
