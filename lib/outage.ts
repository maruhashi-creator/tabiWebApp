import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/webpush";

// Normalize a postal code to 7 digits, or null if it isn't one.
export function normalizeZipcode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/[^0-9]/g, "");
  return digits.length === 7 ? digits : null;
}

/**
 * Which areas (normalized zipcodes) are currently experiencing an outage.
 *
 * MOCK: there is no unified real outage feed yet, so this returns nothing by
 * default. `simulateAreas` lets the cron endpoint inject areas for testing, and
 * is the seam where a real utility feed will be plugged in later.
 */
export async function fetchActiveOutageAreas(simulateAreas?: string[]): Promise<Set<string>> {
  const active = new Set<string>();
  for (const a of simulateAreas ?? []) {
    const z = normalizeZipcode(a);
    if (z) active.add(z);
  }
  return active;
}

export interface OutageRunResult {
  checkedUsers: number;
  newlyOutagedAreas: string[];
  notificationsSent: number;
}

/**
 * Core pipeline: compare the currently-active areas against the last known
 * state, and notify users in areas that just transitioned into an outage.
 * Only the rising edge (false -> true) notifies, per the "発生時のみ" spec.
 */
export async function runOutageCheck(activeAreas: Set<string>): Promise<OutageRunResult> {
  const users = await prisma.user.findMany({
    where: { outageAlert: true, zipcode: { not: null } },
    select: { id: true, zipcode: true },
  });

  // Areas we care about = areas some opted-in user lives in.
  const watchedAreas = new Set<string>();
  for (const u of users) {
    const z = normalizeZipcode(u.zipcode);
    if (z) watchedAreas.add(z);
  }

  const watchedList = Array.from(watchedAreas);
  const states = await prisma.outageState.findMany({
    where: { areaKey: { in: watchedList } },
  });
  const prevActive = new Map(states.map((s) => [s.areaKey, s.active]));

  const newlyOutaged = new Set<string>();
  watchedList.forEach((area) => {
    const isActive = activeAreas.has(area);
    const wasActive = prevActive.get(area) ?? false;
    if (isActive && !wasActive) newlyOutaged.add(area);
  });

  let sent = 0;
  if (newlyOutaged.size > 0) {
    for (const u of users) {
      const z = normalizeZipcode(u.zipcode);
      if (z && newlyOutaged.has(z)) {
        sent += await sendPushToUser(u.id, {
          title: "⚡ 停電アラート",
          body: `お住まいのエリア（〒${z.slice(0, 3)}-${z.slice(3)}）で停電が発生しています。`,
          url: "/",
        });
      }
    }
  }

  // Persist the latest state for every watched area so the next run can detect edges.
  await Promise.all(
    watchedList.map((area) =>
      prisma.outageState.upsert({
        where: { areaKey: area },
        create: { areaKey: area, active: activeAreas.has(area) },
        update: { active: activeAreas.has(area) },
      })
    )
  );

  return {
    checkedUsers: users.length,
    newlyOutagedAreas: Array.from(newlyOutaged),
    notificationsSent: sent,
  };
}
