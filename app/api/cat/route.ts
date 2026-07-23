export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { MIN_CARE_CYCLE, MAX_CARE_CYCLE, type CareCycles } from "@/lib/care";

// Keep only valid numeric day-intervals so a bad client can't store garbage in the JSON column.
function sanitizeCareCycles(input: unknown): CareCycles | null {
  if (!input || typeof input !== "object") return null;
  const out: CareCycles = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const v = Math.round(value);
    if (v < MIN_CARE_CYCLE || v > MAX_CARE_CYCLE) continue;
    out[key] = v;
  }
  return out;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const cats = await prisma.cat.findMany({
    where: { users: { some: { id: session.user.id } } },
    orderBy: { name: "asc" },
  });
  return Response.json(cats);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const body = await req.json();
  const { name, breed, birthday, photo, careCycles } = body as {
    name: string;
    breed?: string;
    birthday?: string | null;
    photo?: string | null;
    careCycles?: unknown;
  };
  if (!name) return Response.json({ error: "名前を入力してね" }, { status: 400 });

  const cat = await prisma.cat.create({
    data: {
      name,
      ...(breed && { breed }),
      ...(birthday && { birthday: new Date(birthday) }),
      ...(photo && { photo }),
      ...(careCycles !== undefined && { careCycles: sanitizeCareCycles(careCycles) ?? Prisma.JsonNull }),
      users: { connect: { id: session.user.id } },
    },
  });
  return Response.json(cat, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const body = await req.json();
  const { id, name, breed, birthday, photo, careCycles } = body as {
    id: string;
    name?: string;
    breed?: string;
    birthday?: string | null;
    photo?: string | null;
    careCycles?: unknown;
  };
  if (!id) return Response.json({ error: "記録が見つからなかったよ" }, { status: 400 });

  try {
    const cat = await prisma.cat.update({
      where: { id, users: { some: { id: session.user.id } } },
      data: {
        ...(name !== undefined && { name }),
        ...(breed !== undefined && { breed }),
        ...(birthday !== undefined && { birthday: birthday ? new Date(birthday) : null }),
        ...(photo !== undefined && { photo }),
        ...(careCycles !== undefined && { careCycles: sanitizeCareCycles(careCycles) ?? Prisma.JsonNull }),
      },
    });
    return Response.json(cat);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "このねこの記録にはアクセスできないよ" }, { status: 403 });
    }
    throw e;
  }
}
