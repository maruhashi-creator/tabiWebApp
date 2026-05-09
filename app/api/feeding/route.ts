export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
    where.fedAt = {
      gte: new Date(`${date}T00:00:00.000+09:00`),
      lte: new Date(`${date}T23:59:59.999+09:00`),
    };
  } else if (from && to) {
    where.fedAt = {
      gte: new Date(`${from}T00:00:00.000+09:00`),
      lte: new Date(`${to}T23:59:59.999+09:00`),
    };
  }

  const logs = await prisma.feedingLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { fedAt: "desc" },
  });
  return Response.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { catId, amount, fedAt, note, foodType } = body as {
    catId: string;
    amount: number;
    fedAt: string;
    note?: string;
    foodType?: string;
  };

  if (!catId || !fedAt) {
    return Response.json({ error: "catId, amount, fedAt は必須です" }, { status: 400 });
  }
  if (typeof amount !== "number" || amount <= 0 || !isFinite(amount)) {
    return Response.json({ error: "amount は正の数値で入力してください" }, { status: 400 });
  }

  const guard = await guardCatOwnership(catId, session.user.id);
  if (guard) return guard;

  const log = await prisma.feedingLog.create({
    data: {
      catId,
      userId: session.user.id,
      foodType,
      amount,
      fedAt: new Date(fedAt),
      note,
    },
    include: { user: { select: { name: true } } },
  });
  return Response.json(log, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const { amount, fedAt, note, foodType } = await req.json() as {
    amount?: number;
    fedAt?: string;
    note?: string;
    foodType?: string;
  };

  if (amount !== undefined && (typeof amount !== "number" || amount <= 0 || !isFinite(amount))) {
    return Response.json({ error: "amount は正の数値で入力してください" }, { status: 400 });
  }

  try {
    const log = await prisma.feedingLog.update({
      where: { id, userId: session.user.id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(fedAt !== undefined && { fedAt: new Date(fedAt) }),
        ...(note !== undefined && { note }),
        ...(foodType !== undefined && { foodType }),
      },
      include: { user: { select: { name: true } } },
    });
    return Response.json(log);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  try {
    await prisma.feedingLog.delete({ where: { id, userId: session.user.id } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }
}
