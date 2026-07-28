export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { fetchActiveOutageAreas, runOutageCheck } from "@/lib/outage";

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(req: NextRequest, simulate: string[]) {
  const active = await fetchActiveOutageAreas(simulate);
  const result = await runOutageCheck(active);
  return Response.json({ ok: true, ...result });
}

// Cron entrypoint. `?simulate=1234567,7654321` injects outaged areas for testing.
export async function GET(req: NextRequest) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const simulate = (req.nextUrl.searchParams.get("simulate") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return run(req, simulate);
}

// Same as GET but takes { simulate: string[] } in the body (manual testing).
export async function POST(req: NextRequest) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { simulate?: string[] };
  return run(req, Array.isArray(body.simulate) ? body.simulate : []);
}
