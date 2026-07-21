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
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const body = await req.json();
  const { catId, type, count, condition, loggedAt } = body as {
    catId: string;
    type: "URINE" | "FECES";
    count: number;
    condition?: string;
    loggedAt: string;
  };

  if (!catId || !type || !loggedAt) {
    return Response.json({ error: "トイレの種類と日時を入力してね" }, { status: 400 });
  }
  if (count !== undefined && (!Number.isInteger(count) || count < 1)) {
    return Response.json({ error: "回数は1以上の数字で入力してね" }, { status: 400 });
  }

  if (!isValidDateString(loggedAt)) {
    return Response.json({ error: "日付と時刻を確認してね" }, { status: 400 });
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

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "記録が見つからなかったよ" }, { status: 400 });

  const { type, count, condition, loggedAt } = await req.json() as {
    type?: "URINE" | "FECES";
    count?: number;
    condition?: string;
    loggedAt?: string;
  };

  if (count !== undefined && (!Number.isInteger(count) || count < 1)) {
    return Response.json({ error: "回数は1以上の数字で入力してね" }, { status: 400 });
  }

  if (loggedAt !== undefined && !isValidDateString(loggedAt)) {
    return Response.json({ error: "日付と時刻を確認してね" }, { status: 400 });
  }

  try {
    const log = await prisma.toiletLog.update({
      where: { id, cat: { users: { some: { id: session.user.id } } } },
      data: {
        ...(type !== undefined && { type }),
        ...(count !== undefined && { count }),
        ...(condition !== undefined && { condition }),
        ...(loggedAt !== undefined && { loggedAt: new Date(loggedAt) }),
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
    await prisma.toiletLog.delete({ where: { id, cat: { users: { some: { id: session.user.id } } } } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "このねこの記録にはアクセスできないよ" }, { status: 403 });
    }
    throw e;
  }
}
