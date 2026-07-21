export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { guardCatOwnership } from "@/lib/cat-auth";
import { isValidDateString } from "@/lib/datetime";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

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
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const body = await req.json();
  const { catId, type, doneAt, note } = body as {
    catId: string;
    type: string;
    doneAt: string;
    note?: string;
  };

  if (!catId || !type || !doneAt) {
    return Response.json({ error: "ケアの種類と日時を入力してね" }, { status: 400 });
  }

  if (!isValidDateString(doneAt)) {
    return Response.json({ error: "日付と時刻を確認してね" }, { status: 400 });
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

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "記録が見つからなかったよ" }, { status: 400 });

  const { doneAt, note } = await req.json() as {
    doneAt?: string;
    note?: string;
  };

  if (doneAt !== undefined && !isValidDateString(doneAt)) {
    return Response.json({ error: "日付と時刻を確認してね" }, { status: 400 });
  }

  try {
    const log = await prisma.careLog.update({
      where: { id, cat: { users: { some: { id: session.user.id } } } },
      data: {
        ...(doneAt !== undefined && { doneAt: new Date(doneAt) }),
        ...(note !== undefined && { note }),
      },
      include: { user: { select: { name: true } } },
    });
    return Response.json(log);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "このねこの記録にはアクセスできないよ" }, { status: 403 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "記録が見つからなかったよ" }, { status: 400 });

  try {
    await prisma.careLog.delete({ where: { id, cat: { users: { some: { id: session.user.id } } } } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "このねこの記録にはアクセスできないよ" }, { status: 403 });
    }
    throw e;
  }
}
