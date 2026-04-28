"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { BottomNav } from "@/components/BottomNav";

interface Cat { id: string; name: string }

interface DayRecord {
  feeding: boolean;
  toilet: boolean;
  weight: boolean;
  medication: boolean;
}

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage() {
  const [cat, setCat] = useState<Cat | null>(null);
  const [month, setMonth] = useState(new Date());
  const [records, setRecords] = useState<Record<string, DayRecord>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cat").then((r) => r.json()).then((cats) => setCat(cats[0] ?? null));
  }, []);

  useEffect(() => {
    if (!cat) return;
    setLoading(true);
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to = format(endOfMonth(month), "yyyy-MM-dd");

    Promise.all([
      fetch(`/api/feeding?catId=${cat.id}&from=${from}&to=${to}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/toilet?catId=${cat.id}&from=${from}&to=${to}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/weight?catId=${cat.id}&limit=200`).then((r) => r.json()).catch(() => []),
      fetch(`/api/medication?catId=${cat.id}&limit=200`).then((r) => r.json()).catch(() => []),
    ]).then(([f, t, w, m]) => {
      const map: Record<string, DayRecord> = {};

      const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
      for (const d of days) {
        const key = format(d, "yyyy-MM-dd");
        map[key] = { feeding: false, toilet: false, weight: false, medication: false };
      }

      const dateOf = (iso: string) => format(new Date(iso), "yyyy-MM-dd");

      if (Array.isArray(f)) f.forEach((x: { fedAt: string }) => { const k = dateOf(x.fedAt); if (map[k]) map[k].feeding = true; });
      if (Array.isArray(t)) t.forEach((x: { loggedAt: string }) => { const k = dateOf(x.loggedAt); if (map[k]) map[k].toilet = true; });
      if (Array.isArray(w)) w.forEach((x: { measuredAt: string }) => { const k = dateOf(x.measuredAt); if (map[k]) map[k].weight = true; });
      if (Array.isArray(m)) m.forEach((x: { givenAt: string }) => { const k = dateOf(x.givenAt); if (map[k]) map[k].medication = true; });

      setRecords(map);
      setLoading(false);
    });
  }, [cat, month]);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startDow = getDay(startOfMonth(month));
  const cells: (Date | null)[] = [...Array(startDow).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="min-h-screen bg-[#F7F5F2] pb-24">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-stone-800">カレンダー</h1>
            <p className="text-[10px] text-stone-400">{cat?.name ?? "たび"}の記録カレンダー</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setMonth((m) => subMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors text-sm">
              ‹
            </button>
            <span className="text-sm font-semibold text-stone-700 tabular-nums">
              {format(month, "yyyy年M月", { locale: ja })}
            </span>
            <button onClick={() => setMonth((m) => addMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors text-sm">
              ›
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-3 pt-4">
        {/* 凡例 */}
        <div className="flex gap-3 px-1 mb-3">
          {[
            { color: "bg-[#F69F9A]", label: "ごはん" },
            { color: "bg-sky-300", label: "トイレ" },
            { color: "bg-emerald-300", label: "体重" },
            { color: "bg-violet-300", label: "お薬" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${l.color}`} />
              <span className="text-[10px] text-stone-400">{l.label}</span>
            </div>
          ))}
        </div>

        <div className="card overflow-hidden">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b border-stone-100">
            {DOW.map((d, i) => (
              <div key={d} className={`py-2 text-center text-[11px] font-semibold ${
                i === 0 ? "text-red-400" : i === 6 ? "text-sky-400" : "text-stone-400"
              }`}>{d}</div>
            ))}
          </div>

          {/* 日付グリッド */}
          {loading ? (
            <div className="py-16 text-center text-stone-300 text-sm">読み込み中...</div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-y divide-stone-50">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="min-h-[52px] bg-stone-50/50" />;
                const key = format(day, "yyyy-MM-dd");
                const rec = records[key];
                const dow = getDay(day);
                const today = isToday(day);
                return (
                  <div key={key} className={`min-h-[52px] p-1.5 flex flex-col ${today ? "bg-[#FFF5F4]" : ""}`}>
                    <span className={`text-[11px] font-medium leading-none mb-1.5 ${
                      today ? "text-[#F69F9A] font-bold" :
                      dow === 0 ? "text-red-400" :
                      dow === 6 ? "text-sky-400" :
                      "text-stone-600"
                    }`}>
                      {format(day, "d")}
                    </span>
                    <div className="flex flex-wrap gap-0.5">
                      {rec?.feeding && <span className="w-1.5 h-1.5 rounded-full bg-[#F69F9A]" />}
                      {rec?.toilet && <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />}
                      {rec?.weight && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />}
                      {rec?.medication && <span className="w-1.5 h-1.5 rounded-full bg-violet-300" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
