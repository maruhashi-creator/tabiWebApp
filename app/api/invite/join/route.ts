import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json() as { code: string };
  if (!code) return Response.json({ error: "コードを入力してください" }, { status: 400 });

  const invite = await prisma.inviteCode.findUnique({
    where: { code: code.toUpperCase() },
    include: { cat: true },
  });

  if (!invite) return Response.json({ error: "招待コードが見つかりません" }, { status: 404 });
  if (invite.usedAt) return Response.json({ error: "このコードはすでに使用済みです" }, { status: 409 });
  if (invite.expiresAt < new Date()) return Response.json({ error: "招待コードの有効期限が切れています" }, { status: 410 });

  const alreadyMember = await prisma.cat.findFirst({
    where: { id: invite.catId, users: { some: { id: session.user.id } } },
  });
  if (alreadyMember) return Response.json({ error: "すでにこの猫に参加しています" }, { status: 409 });

  await prisma.$transaction([
    prisma.cat.update({
      where: { id: invite.catId },
      data: { users: { connect: { id: session.user.id } } },
    }),
    prisma.inviteCode.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedById: session.user.id },
    }),
  ]);

  return Response.json({ ok: true, catName: invite.cat.name });
}
