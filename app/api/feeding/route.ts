export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const TZ = "Asia/Tokyo";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const catId = searchParams.get("catId");

  const where: Record<string, unknown> = { catId: catId ?? undefined };
  if (date) {
    const d = fromZonedTime(new Date(date), TZ);
    where.fedAt = { gte: startOfDay(d), lte: endOfDay(d) };
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
  const { catId, amount, fedAt, note } = body as {
    catId: string;
    amount: number;
    fedAt: string;
    note?: string;
  };

  if (!catId || !amount || !fedAt) {
    return Response.json({ error: "catId, amount, fedAt は必須です" }, { status: 400 });
  }

  const log = await prisma.feedingLog.create({
    data: {
      catId,
      userId: session.user.id,
      amount,
      fedAt: new Date(fedAt),
      note,
    },
    include: { user: { select: { name: true } } },
  });
  return Response.json(log, { status: 201 });
}
