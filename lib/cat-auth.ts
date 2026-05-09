import { prisma } from "@/lib/prisma";

/** Returns a 403 Response if the cat does not belong to the user, otherwise null. */
export async function guardCatOwnership(
  catId: string | null | undefined,
  userId: string
): Promise<Response | null> {
  if (!catId) {
    return Response.json({ error: "catId is required" }, { status: 400 });
  }
  const cat = await prisma.cat.findFirst({
    where: { id: catId, users: { some: { id: userId } } },
    select: { id: true },
  });
  if (!cat) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
