import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const cat = await prisma.cat.findFirst({
    where: { users: { some: { id: session.user.id } } },
  });
  if (!cat) return Response.json({ error: "ねこが登録されていないよ" }, { status: 404 });

  let code = generateCode();
  while (await prisma.inviteCode.findUnique({ where: { code } })) {
    code = generateCode();
  }

  const invite = await prisma.inviteCode.create({
    data: {
      code,
      catId: cat.id,
      createdById: session.user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return Response.json({ code: invite.code, expiresAt: invite.expiresAt });
}
