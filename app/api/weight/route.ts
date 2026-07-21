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
  const limit = Number(searchParams.get("limit") ?? "30");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const guard = await guardCatOwnership(catId, session.user.id);
  if (guard) return guard;

  const where: Record<string, unknown> = { catId: catId! };
  if (from && to) {
    where.measuredAt = {
      gte: new Date(`${from}T00:00:00.000+09:00`),
      lte: new Date(`${to}T23:59:59.999+09:00`),
    };
  }

  const logs = await prisma.weightLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { measuredAt: "desc" },
    ...(from && to ? {} : { take: limit }),
  });
  return Response.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const body = await req.json();
  const { catId, weight, measuredAt, note } = body as {
    catId: string;
    weight: number;
    measuredAt: string;
    note?: string;
  };

  if (!catId || !measuredAt) {
    return Response.json({ error: "体重と日時を入力してね" }, { status: 400 });
  }
  if (typeof weight !== "number" || weight <= 0 || !isFinite(weight)) {
    return Response.json({ error: "体重は数字で入力してね" }, { status: 400 });
  }

  if (!isValidDateString(measuredAt)) {
    return Response.json({ error: "日付と時刻を確認してね" }, { status: 400 });
  }

  const guard = await guardCatOwnership(catId, session.user.id);
  if (guard) return guard;

  const log = await prisma.weightLog.create({
    data: {
      catId,
      userId: session.user.id,
      weight,
      measuredAt: new Date(measuredAt),
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

  const { weight, measuredAt, note } = await req.json() as {
    weight?: number;
    measuredAt?: string;
    note?: string;
  };

  if (weight !== undefined && (typeof weight !== "number" || weight <= 0 || !isFinite(weight))) {
    return Response.json({ error: "体重は数字で入力してね" }, { status: 400 });
  }

  if (measuredAt !== undefined && !isValidDateString(measuredAt)) {
    return Response.json({ error: "日付と時刻を確認してね" }, { status: 400 });
  }

  try {
    const log = await prisma.weightLog.update({
      where: { id, cat: { users: { some: { id: session.user.id } } } },
      data: {
        ...(weight !== undefined && { weight }),
        ...(measuredAt !== undefined && { measuredAt: new Date(measuredAt) }),
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
    await prisma.weightLog.delete({ where: { id, cat: { users: { some: { id: session.user.id } } } } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "このねこの記録にはアクセスできないよ" }, { status: 403 });
    }
    throw e;
  }
}
