"use client";

import { useEffect, useRef, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { BottomNav } from "@/components/BottomNav";

interface Cat { id: string; name: string }
interface FeedingLog { id: string; amount: number; foodType: string | null; fedAt: string; user: { name: string } }
interface ToiletLog { id: string; type: string; count: number; loggedAt: string; user: { name: string } }
interface WeightLog { id: string; weight: number; measuredAt: string; user: { name: string } }
interface MedicationLog { id: string; name: string; dosage: string | null; givenAt: string; user: { name: string } }

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
  const [feedings, setFeedings] = useState<FeedingLog[]>([]);
  const [toilets, setToilets] = useState<ToiletLog[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [medications, setMedications] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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
      const safeF: FeedingLog[] = Array.isArray(f) ? f : [];
      const safeT: ToiletLog[] = Array.isArray(t) ? t : [];
      const safeW: WeightLog[] = Array.isArray(w) ? w : [];
      const safeM: MedicationLog[] = Array.isArray(m) ? m : [];

      setFeedings(safeF);
      setToilets(safeT);
      setWeights(safeW);
      setMedications(safeM);

      const map: Record<string, DayRecord> = {};
      const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
      for (const d of days) {
        const key = format(d, "yyyy-MM-dd");
        map[key] = { feeding: false, toilet: false, weight: false, medication: false };
      }

      const dateOf = (iso: string) => format(new Date(iso), "yyyy-MM-dd");
      safeF.forEach((x) => { const k = dateOf(x.fedAt); if (map[k]) map[k].feeding = true; });
      safeT.forEach((x) => { const k = dateOf(x.loggedAt); if (map[k]) map[k].toilet = true; });
      safeW.forEach((x) => { const k = dateOf(x.measuredAt); if (map[k]) map[k].weight = true; });
      safeM.forEach((x) => { const k = dateOf(x.givenAt); if (map[k]) map[k].medication = true; });

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
                const hasAny = rec && (rec.feeding || rec.toilet || rec.weight || rec.medication);
                return (
                  <button
                    key={key}
                    onClick={() => hasAny ? setSelectedDay(key) : undefined}
                    className={`min-h-[52px] p-1.5 flex flex-col text-left w-full transition-colors ${
                      today ? "bg-[#FFF5F4]" : ""
                    } ${hasAny ? "active:bg-stone-50" : ""}`}
                  >
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
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <DaySheet
        day={selectedDay}
        feedings={feedings}
        toilets={toilets}
        weights={weights}
        medications={medications}
        onClose={() => setSelectedDay(null)}
      />

      <BottomNav />
    </div>
  );
}

function DaySheet({
  day, feedings, toilets, weights, medications, onClose,
}: {
  day: string | null;
  feedings: FeedingLog[];
  toilets: ToiletLog[];
  weights: WeightLog[];
  medications: MedicationLog[];
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const open = day !== null;

  // キーボードESCで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!day) return null;

  const dateOf = (iso: string) => format(new Date(iso), "yyyy-MM-dd");
  const dayFeedings = feedings.filter((x) => dateOf(x.fedAt) === day)
    .sort((a, b) => new Date(a.fedAt).getTime() - new Date(b.fedAt).getTime());
  const dayToilets = toilets.filter((x) => dateOf(x.loggedAt) === day)
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
  const dayWeights = weights.filter((x) => dateOf(x.measuredAt) === day)
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
  const dayMeds = medications.filter((x) => dateOf(x.givenAt) === day)
    .sort((a, b) => new Date(a.givenAt).getTime() - new Date(b.givenAt).getTime());

  const dateLabel = format(new Date(day), "M月d日(E)", { locale: ja });

  function foodEmoji(foodType: string | null) {
    if (foodType === "ミルク") return "🥛";
    if (foodType === "おやつ") return "🍬";
    if (foodType === "ウェット") return "🍖";
    return "🥣";
  }

  return (
    <>
      {/* オーバーレイ */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* ボトムシート */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "70vh" }}
      >
        {/* ハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-200" />
        </div>

        {/* ヘッダー */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-stone-100">
          <p className="text-sm font-bold text-stone-800">{dateLabel}</p>
          <button onClick={onClose} className="text-stone-300 hover:text-stone-500 transition-colors text-xl leading-none">×</button>
        </div>

        {/* コンテンツ */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 80px)" }}>
          {dayFeedings.length === 0 && dayToilets.length === 0 && dayWeights.length === 0 && dayMeds.length === 0 ? (
            <p className="text-center text-sm text-stone-300 py-10">この日の記録はありません</p>
          ) : (
            <div className="divide-y divide-stone-50">
              {dayFeedings.map((f) => (
                <div key={f.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xl w-7 text-center">{foodEmoji(f.foodType)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-700">
                      {f.foodType ?? "ごはん"}
                      <span className="text-xs font-normal text-stone-400 ml-1">
                        {f.amount}{f.foodType === "ミルク" ? "ml" : "g"}
                      </span>
                    </p>
                    <p className="text-xs text-stone-400">{f.user.name}</p>
                  </div>
                  <p className="text-xs text-stone-400 tabular-nums">{format(new Date(f.fedAt), "HH:mm")}</p>
                </div>
              ))}
              {dayToilets.map((t) => (
                <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xl w-7 text-center">{t.type === "URINE" ? "💧" : "🌼"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-700">
                      {t.type === "URINE" ? "おしっこ" : "うんち"}
                      <span className="text-xs font-normal text-stone-400 ml-1">{t.count}回</span>
                    </p>
                    <p className="text-xs text-stone-400">{t.user.name}</p>
                  </div>
                  <p className="text-xs text-stone-400 tabular-nums">{format(new Date(t.loggedAt), "HH:mm")}</p>
                </div>
              ))}
              {dayWeights.map((w) => (
                <div key={w.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xl w-7 text-center">⚖️</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-700">
                      {w.weight.toFixed(2)}
                      <span className="text-xs font-normal text-stone-400 ml-0.5">kg</span>
                    </p>
                    <p className="text-xs text-stone-400">{w.user.name}</p>
                  </div>
                  <p className="text-xs text-stone-400 tabular-nums">{format(new Date(w.measuredAt), "HH:mm")}</p>
                </div>
              ))}
              {dayMeds.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xl w-7 text-center">💊</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-700">
                      {m.name}
                      {m.dosage && <span className="text-xs font-normal text-stone-400 ml-1">{m.dosage}</span>}
                    </p>
                    <p className="text-xs text-stone-400">{m.user.name}</p>
                  </div>
                  <p className="text-xs text-stone-400 tabular-nums">{format(new Date(m.givenAt), "HH:mm")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
