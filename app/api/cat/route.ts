export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const cats = await prisma.cat.findMany({ orderBy: { name: "asc" } });
  return Response.json(cats);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name, breed, birthday } = body as {
    id: string;
    name?: string;
    breed?: string;
    birthday?: string | null;
  };
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const cat = await prisma.cat.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(breed !== undefined && { breed }),
      ...(birthday !== undefined && { birthday: birthday ? new Date(birthday) : null }),
    },
  });
  return Response.json(cat);
}
