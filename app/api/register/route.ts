import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password } = body as { name: string; email: string; password: string };

  if (!name || !email || !password) {
    return Response.json({ error: "name, email, password は必須です" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "パスワードは6文字以上で入力してください" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "このメールアドレスはすでに登録されています" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, password: hashed } });

  return Response.json({ ok: true }, { status: 201 });
}
