export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const catId = searchParams.get("catId");

  const where: Record<string, unknown> = { catId: catId ?? undefined };
  if (date) {
    // datetime-local values are stored as UTC without offset conversion,
    // so match the date string directly in UTC
    where.loggedAt = {
      gte: new Date(`${date}T00:00:00.000Z`),
      lte: new Date(`${date}T23:59:59.999Z`),
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
