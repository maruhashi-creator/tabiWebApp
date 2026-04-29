export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Anomaly {
  type: "weight" | "urine" | "feeding";
  level: "warn" | "alert";
  message: string;
}

function toJstDay(date: Date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return Response.json({ error: "date is required" }, { status: 400 });

  const cat = await prisma.cat.findFirst({ orderBy: { name: "asc" } });
  if (!cat) return Response.json({ error: "cat not found" }, { status: 404 });

  const todayStart = new Date(`${date}T00:00:00.000+09:00`);
  const todayEnd = new Date(`${date}T23:59:59.999+09:00`);
  const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [feedings, toilets, weights, anomalyWeights, anomalyToilets, anomalyFeedings] =
    await Promise.all([
      prisma.feedingLog.findMany({
        where: { catId: cat.id, fedAt: { gte: todayStart, lte: todayEnd } },
        include: { user: { select: { name: true } } },
        orderBy: { fedAt: "desc" },
      }),
      prisma.toiletLog.findMany({
        where: { catId: cat.id, loggedAt: { gte: todayStart, lte: todayEnd } },
        include: { user: { select: { name: true } } },
        orderBy: { loggedAt: "desc" },
      }),
      prisma.weightLog.findMany({
        where: { catId: cat.id },
        orderBy: { measuredAt: "desc" },
        take: 1,
      }),
      prisma.weightLog.findMany({
        where: { catId: cat.id, measuredAt: { gte: sevenDaysAgo } },
        orderBy: { measuredAt: "desc" },
      }),
      prisma.toiletLog.findMany({
        where: { catId: cat.id, loggedAt: { gte: sevenDaysAgo } },
      }),
      prisma.feedingLog.findMany({
        where: { catId: cat.id, fedAt: { gte: sevenDaysAgo } },
      }),
    ]);

  const anomalies: Anomaly[] = [];

  if (anomalyWeights.length >= 2) {
    const latest = anomalyWeights[0].weight;
    const prev = anomalyWeights[1].weight;
    const changePct = Math.abs((latest - prev) / prev);
    if (changePct >= 0.1) {
      anomalies.push({
        type: "weight",
        level: changePct >= 0.15 ? "alert" : "warn",
        message: changePct >= 0.15 ? "体重が大きく変化しているかも" : "体重に変化があるかも",
      });
    }
  }

  const todayUrine = anomalyToilets
    .filter((t) => t.type === "URINE" && toJstDay(t.loggedAt) === date)
    .reduce((s, t) => s + t.count, 0);
  const pastUrine = anomalyToilets.filter((t) => t.type === "URINE" && toJstDay(t.loggedAt) !== date);
  if (pastUrine.length > 0) {
    const byDay = new Map<string, number>();
    for (const t of pastUrine) {
      const day = toJstDay(t.loggedAt);
      byDay.set(day, (byDay.get(day) ?? 0) + t.count);
    }
    const avgUrine = Array.from(byDay.values()).reduce((s, v) => s + v, 0) / byDay.size;
    if (avgUrine > 0 && todayUrine < avgUrine * 0.5) {
      anomalies.push({
        type: "urine",
        level: todayUrine === 0 ? "alert" : "warn",
        message: todayUrine === 0 ? "今日おしっこの記録がないよ" : "おしっこの回数が少ないかも",
      });
    }
  }

  const todayFed = anomalyFeedings
    .filter((f) => toJstDay(f.fedAt) === date)
    .reduce((s, f) => s + f.amount, 0);
  const pastFeedings = anomalyFeedings.filter((f) => toJstDay(f.fedAt) !== date);
  if (pastFeedings.length > 0) {
    const byDay = new Map<string, number>();
    for (const f of pastFeedings) {
      const day = toJstDay(f.fedAt);
      byDay.set(day, (byDay.get(day) ?? 0) + f.amount);
    }
    const avgFed = Array.from(byDay.values()).reduce((s, v) => s + v, 0) / byDay.size;
    if (avgFed > 0 && todayFed < avgFed * 0.5) {
      anomalies.push({
        type: "feeding",
        level: todayFed === 0 ? "alert" : "warn",
        message: todayFed === 0 ? "今日ごはんの記録がないよ" : "食事量が平均より少ないかも",
      });
    }
  }

  return Response.json({ cat, feedings, toilets, latestWeight: weights[0] ?? null, anomalies });
}
