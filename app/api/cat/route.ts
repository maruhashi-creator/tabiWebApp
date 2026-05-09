export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const cats = await prisma.cat.findMany({
    where: { users: { some: { id: session.user.id } } },
    orderBy: { name: "asc" },
  });
  return Response.json(cats);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, breed, birthday } = body as {
    name: string;
    breed?: string;
    birthday?: string | null;
  };
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  const cat = await prisma.cat.create({
    data: {
      name,
      ...(breed && { breed }),
      ...(birthday && { birthday: new Date(birthday) }),
      users: { connect: { id: session.user.id } },
    },
  });
  return Response.json(cat, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name, breed, birthday, photo } = body as {
    id: string;
    name?: string;
    breed?: string;
    birthday?: string | null;
    photo?: string | null;
  };
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  try {
    const cat = await prisma.cat.update({
      where: { id, users: { some: { id: session.user.id } } },
      data: {
        ...(name !== undefined && { name }),
        ...(breed !== undefined && { breed }),
        ...(birthday !== undefined && { birthday: birthday ? new Date(birthday) : null }),
        ...(photo !== undefined && { photo }),
      },
    });
    return Response.json(cat);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }
}
