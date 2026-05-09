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
  const limit = Number(searchParams.get("limit") ?? "30");

  const guard = await guardCatOwnership(catId, session.user.id);
  if (guard) return guard;

  const logs = await prisma.weightLog.findMany({
    where: { catId: catId! },
    include: { user: { select: { name: true } } },
    orderBy: { measuredAt: "desc" },
    take: limit,
  });
  return Response.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { catId, weight, measuredAt, note } = body as {
    catId: string;
    weight: number;
    measuredAt: string;
    note?: string;
  };

  if (!catId || !measuredAt) {
    return Response.json({ error: "catId, weight, measuredAt は必須です" }, { status: 400 });
  }
  if (typeof weight !== "number" || weight <= 0 || !isFinite(weight)) {
    return Response.json({ error: "weight は正の数値で入力してください" }, { status: 400 });
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
