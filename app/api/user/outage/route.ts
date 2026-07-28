export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeZipcode } from "@/lib/outage";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { zipcode: true, outageAlert: true },
  });
  return Response.json({ zipcode: user?.zipcode ?? "", outageAlert: user?.outageAlert ?? false });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "ログインしてね" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { zipcode?: string; outageAlert?: boolean };

  let zipcode: string | null | undefined;
  if (body.zipcode !== undefined) {
    if (body.zipcode === "") {
      zipcode = null;
    } else {
      zipcode = normalizeZipcode(body.zipcode);
      if (!zipcode) return Response.json({ error: "郵便番号は数字7桁で入力してね" }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(zipcode !== undefined && { zipcode }),
      ...(body.outageAlert !== undefined && { outageAlert: body.outageAlert }),
    },
    select: { zipcode: true, outageAlert: true },
  });
  return Response.json({ zipcode: user.zipcode ?? "", outageAlert: user.outageAlert });
}
