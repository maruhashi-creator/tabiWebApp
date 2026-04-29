export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface Anomaly {
  type: "weight" | "urine" | "feeding";
  level: "warn" | "alert";
  message: string;
}

export async function GET(req: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const catId = searchParams.get("catId");
  if (!catId) return Response.json({ error: "catId is required" }, { status: 400 });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const jstToday = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayDate = jstToday.toISOString().slice(0, 10);
  const todayStart = new Date(`${todayDate}T00:00:00.000+09:00`);
  const todayEnd = new Date(`${todayDate}T23:59:59.999+09:00`);

  const toJstDay = (date: Date) => new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [weights, toilets, feedings] = await Promise.all([
    prisma.weightLog.findMany({
      where: { catId, measuredAt: { gte: sevenDaysAgo } },
      orderBy: { measuredAt: "desc" },
    }),
    prisma.toiletLog.findMany({
      where: { catId, loggedAt: { gte: sevenDaysAgo } },
    }),
    prisma.feedingLog.findMany({
      where: { catId, fedAt: { gte: sevenDaysAgo } },
    }),
  ]);

  const anomalies: Anomaly[] = [];

  // Weight anomaly: latest vs previous weight change > 10%
  if (weights.length >= 2) {
    const latest = weights[0].weight;
    const prev = weights[1].weight;
    const changePct = Math.abs((latest - prev) / prev);
    if (changePct >= 0.1) {
      const dir = latest > prev ? "増加" : "減少";
      anomalies.push({
        type: "weight",
        level: changePct >= 0.15 ? "alert" : "warn",
        message: changePct >= 0.15 ? "体重が大きく変化しているかも" : "体重に変化があるかも",
      });
    }
  }

  // Urine anomaly: today vs 7-day daily average
  const todayUrine = toilets
    .filter((t) => t.type === "URINE" && toJstDay(t.loggedAt) === todayDate)
    .reduce((s, t) => s + t.count, 0);

  const pastUrine = toilets.filter((t) => t.type === "URINE" && toJstDay(t.loggedAt) !== todayDate);
  if (pastUrine.length > 0) {
    // group by local day to get daily average
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
        message: todayUrine === 0
          ? "今日おしっこの記録がないよ"
          : "おしっこの回数が少ないかも",
      });
    }
  }

  // Feeding anomaly: today vs 7-day daily average
  const todayFed = feedings
    .filter((f) => toJstDay(f.fedAt) === todayDate)
    .reduce((s, f) => s + f.amount, 0);

  const pastFeedings = feedings.filter((f) => toJstDay(f.fedAt) !== todayDate);
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
        message: todayFed === 0
          ? "今日ごはんの記録がないよ"
          : "食事量が平均より少ないかも",
      });
    }
  }

  return Response.json(anomalies);
  } catch {
    return Response.json([], { status: 200 });
  }
}
