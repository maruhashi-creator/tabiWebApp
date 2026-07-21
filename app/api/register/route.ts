import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, password } = body as {
    name: string;
    email?: string;
    phone?: string;
    password: string;
  };

  if (!name || (!email && !phone) || !password) {
    return Response.json({ error: "お名前・連絡先・パスワードをすべて入力してね" }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "メールアドレスの形式を確認してね" }, { status: 400 });
  }
  if (phone && !/^0\d{9,10}$/.test(phone.replace(/-/g, ""))) {
    return Response.json({ error: "電話番号の形式を確認してね（例: 09012345678）" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "パスワードは6文字以上にしてね" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
  });
  if (existing) {
    const label = email ? "このメールアドレス" : "この携帯番号";
    return Response.json({ error: `${label}はすでに登録されています` }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email: email || null, phone: phone || null, password: hashed } });

  return Response.json({ ok: true }, { status: 201 });
}
