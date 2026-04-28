"use client";

import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { BottomNav } from "@/components/BottomNav";

interface Cat { id: string; name: string }
interface WeightLog { id: string; weight: number; measuredAt: string }
interface FeedingLog { id: string; amount: number; foodType: string | null; fedAt: string }

export default function GraphPage() {
  const [cat, setCat] = useState<Cat | null>(null);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [feedings, setFeedings] = useState<FeedingLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cats = await fetch("/api/cat").then((r) => r.json());
      const c: Cat = cats[0];
      if (!c) { setLoading(false); return; }
      setCat(c);

      const from = format(subDays(new Date(), 29), "yyyy-MM-dd");
      const to = format(new Date(), "yyyy-MM-dd");

      const [w, f] = await Promise.all([
        fetch(`/api/weight?catId=${c.id}&limit=30`).then((r) => r.json()).catch(() => []),
        fetch(`/api/feeding?catId=${c.id}&from=${from}&to=${to}`).then((r) => r.json()).catch(() => []),
      ]);
      setWeights(Array.isArray(w) ? w : []);
      setFeedings(Array.isArray(f) ? f : []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2]">
        <span className="text-3xl animate-bounce">📈</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] pb-24">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-stone-800">グラフ</h1>
          <p className="text-[10px] text-stone-400">{cat?.name ?? "たび"}の記録の推移</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <section className="card p-4">
          <p className="text-xs font-semibold text-stone-400 mb-3">体重の推移</p>
          <WeightChart data={weights} />
        </section>

        <section className="card p-4">
          <p className="text-xs font-semibold text-stone-400 mb-3">食事量（過去30日）</p>
          <FeedingChart data={feedings} />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

function WeightChart({ data }: { data: WeightLog[] }) {
  if (data.length === 0) {
    return <p className="text-center text-sm text-stone-300 py-8">体重データがありません</p>;
  }

  const sorted = [...data]
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .slice(-20);

  const W = 300, H = 160;
  const pL = 46, pR = 12, pT = 16, pB = 28;
  const pw = W - pL - pR;
  const ph = H - pT - pB;

  const ws = sorted.map((d) => d.weight);
  const minW = Math.min(...ws);
  const maxW = Math.max(...ws);
  const span = maxW - minW || 0.5;
  const lo = minW - span * 0.15;
  const hi = maxW + span * 0.15;

  const cx = (i: number) =>
    sorted.length === 1 ? pL + pw / 2 : pL + (i / (sorted.length - 1)) * pw;
  const cy = (w: number) => pT + ph * (1 - (w - lo) / (hi - lo));

  const polyline = sorted.map((d, i) => `${cx(i)},${cy(d.weight)}`).join(" ");

  const yLabels = [hi, (hi + lo) / 2, lo];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* grid lines */}
      {yLabels.map((v, i) => (
        <line key={i} x1={pL} y1={cy(v)} x2={W - pR} y2={cy(v)} stroke="#f5f5f4" strokeWidth="1" />
      ))}
      {/* line */}
      <polyline points={polyline} fill="none" stroke="#F69F9A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* dots */}
      {sorted.map((d, i) => (
        <circle key={i} cx={cx(i)} cy={cy(d.weight)} r="3" fill="#F69F9A" />
      ))}
      {/* y-axis labels */}
      {yLabels.map((v, i) => (
        <text key={i} x={pL - 4} y={cy(v) + 3.5} textAnchor="end" fontSize="9" fill="#a8a29e">
          {v.toFixed(2)}
        </text>
      ))}
      {/* x-axis labels */}
      <text x={pL} y={H - 4} textAnchor="middle" fontSize="8" fill="#a8a29e">
        {format(new Date(sorted[0].measuredAt), "M/d")}
      </text>
      {sorted.length > 1 && (
        <text x={W - pR} y={H - 4} textAnchor="end" fontSize="8" fill="#a8a29e">
          {format(new Date(sorted[sorted.length - 1].measuredAt), "M/d")}
        </text>
      )}
      {/* unit */}
      <text x={pL - 4} y={pT - 4} textAnchor="end" fontSize="8" fill="#c7c3bd">kg</text>
    </svg>
  );
}

function FeedingChart({ data }: { data: FeedingLog[] }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    return format(d, "yyyy-MM-dd");
  });

  const dailyTotals = days.map((day) => ({
    day,
    total: data
      .filter((f) => format(new Date(f.fedAt), "yyyy-MM-dd") === day)
      .reduce((s, f) => s + f.amount, 0),
  }));

  const maxTotal = Math.max(...dailyTotals.map((d) => d.total), 1);

  if (dailyTotals.every((d) => d.total === 0)) {
    return <p className="text-center text-sm text-stone-300 py-8">食事データがありません</p>;
  }

  const W = 300, H = 140;
  const pL = 38, pR = 8, pT = 14, pB = 24;
  const pw = W - pL - pR;
  const ph = H - pT - pB;
  const step = pw / 30;
  const barW = step * 0.65;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* grid lines */}
      {[0, 0.5, 1].map((t, i) => (
        <line key={i} x1={pL} y1={pT + ph * t} x2={W - pR} y2={pT + ph * t} stroke="#f5f5f4" strokeWidth="1" />
      ))}
      {/* bars */}
      {dailyTotals.map((d, i) => {
        const barH = (d.total / maxTotal) * ph;
        const x = pL + i * step + (step - barW) / 2;
        const y = pT + ph - barH;
        return (
          <rect key={i} x={x} y={d.total > 0 ? y : pT + ph - 1} width={barW}
            height={d.total > 0 ? barH : 1}
            fill={d.total > 0 ? "#F69F9A" : "#f5f5f4"} rx="1.5" />
        );
      })}
      {/* x-axis labels */}
      <text x={pL + step * 0.5} y={H - 5} textAnchor="middle" fontSize="8" fill="#a8a29e">
        {format(new Date(days[0]), "M/d")}
      </text>
      <text x={pL + step * 29.5} y={H - 5} textAnchor="end" fontSize="8" fill="#a8a29e">
        {format(new Date(days[29]), "M/d")}
      </text>
      {/* y-axis labels */}
      <text x={pL - 2} y={pT + 4} textAnchor="end" fontSize="8" fill="#a8a29e">{maxTotal}g</text>
      <text x={pL - 2} y={pT + ph / 2 + 4} textAnchor="end" fontSize="8" fill="#c7c3bd">
        {Math.round(maxTotal / 2)}g
      </text>
      <text x={pL - 4} y={pT - 4} textAnchor="end" fontSize="8" fill="#c7c3bd">g</text>
    </svg>
  );
}
