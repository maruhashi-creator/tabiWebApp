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
  const catId = searchParams.get("catId");
  const limit = Number(searchParams.get("limit") ?? "100");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const guard = await guardCatOwnership(catId, session.user.id);
  if (guard) return guard;

  const where: Record<string, unknown> = { catId: catId! };
  if (from && to) {
    where.doneAt = {
      gte: new Date(`${from}T00:00:00.000+09:00`),
      lte: new Date(`${to}T23:59:59.999+09:00`),
    };
  }

  const logs = await prisma.careLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { doneAt: "desc" },
    take: limit,
  });
  return Response.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { catId, type, doneAt, note } = body as {
    catId: string;
    type: string;
    doneAt: string;
    note?: string;
  };

  if (!catId || !type || !doneAt) {
    return Response.json({ error: "catId, type, doneAt は必須です" }, { status: 400 });
  }

  const guard = await guardCatOwnership(catId, session.user.id);
  if (guard) return guard;

  const log = await prisma.careLog.create({
    data: {
      catId,
      userId: session.user.id,
      type,
      doneAt: new Date(doneAt),
      note,
    },
    include: { user: { select: { name: true } } },
  });
  return Response.json(log, { status: 201 });
}
