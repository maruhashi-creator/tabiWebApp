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
  const limit = Number(searchParams.get("limit") ?? "10");

  const guard = await guardCatOwnership(catId, session.user.id);
  if (guard) return guard;

  const logs = await prisma.medicationLog.findMany({
    where: { catId: catId! },
    include: { user: { select: { name: true } } },
    orderBy: { givenAt: "desc" },
    take: limit,
  });
  return Response.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { catId, name, dosage, givenAt, note } = body as {
    catId: string;
    name: string;
    dosage?: string;
    givenAt: string;
    note?: string;
  };

  if (!catId || !name || !givenAt) {
    return Response.json({ error: "catId, name, givenAt は必須です" }, { status: 400 });
  }

  const guard = await guardCatOwnership(catId, session.user.id);
  if (guard) return guard;

  const log = await prisma.medicationLog.create({
    data: {
      catId,
      userId: session.user.id,
      name,
      dosage,
      givenAt: new Date(givenAt),
      note,
    },
    include: { user: { select: { name: true } } },
  });
  return Response.json(log, { status: 201 });
}
