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

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const { name, dosage, givenAt, note } = await req.json() as {
    name?: string;
    dosage?: string;
    givenAt?: string;
    note?: string;
  };

  try {
    const log = await prisma.medicationLog.update({
      where: { id, userId: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(dosage !== undefined && { dosage }),
        ...(givenAt !== undefined && { givenAt: new Date(givenAt) }),
        ...(note !== undefined && { note }),
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
    await prisma.medicationLog.delete({ where: { id, userId: session.user.id } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }
}
