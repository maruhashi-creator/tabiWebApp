"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import NoCatNotice from "@/components/NoCatNotice";
import { catName } from "@/lib/messages";

interface Cat { id: string; name: string }
interface FeedingLog { id: string; amount: number; foodType: string | null; fedAt: string; note?: string | null; user: { name: string } }
interface ToiletLog { id: string; type: string; count: number; loggedAt: string; user: { name: string } }
interface WeightLog { id: string; weight: number; measuredAt: string; note?: string | null; user: { name: string } }
interface MedicationLog { id: string; name: string; dosage: string | null; givenAt: string; user: { name: string } }
interface CareLog { id: string; type: string; doneAt: string; user: { name: string } }

interface DayRecord {
  feeding: boolean;
  toilet: boolean;
  weight: boolean;
  medication: boolean;
  care: boolean;
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
  const [cares, setCares] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cat")
      .then((r) => r.json())
      .then((cats) => setCat(cats[0] ?? null))
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, []);

  useEffect(() => {
    if (!cat) return;
    setLoading(true);
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to = format(endOfMonth(month), "yyyy-MM-dd");

    Promise.all([
      fetch(`/api/feeding?catId=${cat.id}&from=${from}&to=${to}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/toilet?catId=${cat.id}&from=${from}&to=${to}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/weight?catId=${cat.id}&from=${from}&to=${to}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/medication?catId=${cat.id}&from=${from}&to=${to}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/care?catId=${cat.id}&from=${from}&to=${to}`).then((r) => r.json()).catch(() => []),
    ]).then(([f, t, w, m, c]) => {
      const safeF: FeedingLog[] = Array.isArray(f) ? f : [];
      const safeT: ToiletLog[] = Array.isArray(t) ? t : [];
      const safeW: WeightLog[] = Array.isArray(w) ? w : [];
      const safeM: MedicationLog[] = Array.isArray(m) ? m : [];
      const safeC: CareLog[] = Array.isArray(c) ? c : [];

      setFeedings(safeF);
      setToilets(safeT);
      setWeights(safeW);
      setMedications(safeM);
      setCares(safeC);

      const map: Record<string, DayRecord> = {};
      const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
      for (const d of days) {
        const key = format(d, "yyyy-MM-dd");
        map[key] = { feeding: false, toilet: false, weight: false, medication: false, care: false };
      }

      const dateOf = (iso: string) => format(new Date(iso), "yyyy-MM-dd");
      safeF.forEach((x) => { const k = dateOf(x.fedAt); if (map[k]) map[k].feeding = true; });
      safeT.forEach((x) => { const k = dateOf(x.loggedAt); if (map[k]) map[k].toilet = true; });
      safeW.forEach((x) => { const k = dateOf(x.measuredAt); if (map[k]) map[k].weight = true; });
      safeM.forEach((x) => { const k = dateOf(x.givenAt); if (map[k]) map[k].medication = true; });
      safeC.forEach((x) => { const k = dateOf(x.doneAt); if (map[k]) map[k].care = true; });

      setRecords(map);
      setLoading(false);
    });
  }, [cat, month]);

  const handleDelete = useCallback((type: string, id: string) => {
    if (type === "feeding") setFeedings((p) => p.filter((x) => x.id !== id));
    else if (type === "toilet") setToilets((p) => p.filter((x) => x.id !== id));
    else if (type === "weight") setWeights((p) => p.filter((x) => x.id !== id));
    else if (type === "medication") setMedications((p) => p.filter((x) => x.id !== id));
    else if (type === "care") setCares((p) => p.filter((x) => x.id !== id));
  }, []);

  const handleUpdate = useCallback((type: string, updated: FeedingLog | ToiletLog | WeightLog | MedicationLog | CareLog) => {
    if (type === "feeding") setFeedings((p) => p.map((x) => x.id === updated.id ? updated as FeedingLog : x));
    else if (type === "toilet") setToilets((p) => p.map((x) => x.id === updated.id ? updated as ToiletLog : x));
    else if (type === "weight") setWeights((p) => p.map((x) => x.id === updated.id ? updated as WeightLog : x));
    else if (type === "medication") setMedications((p) => p.map((x) => x.id === updated.id ? updated as MedicationLog : x));
    else if (type === "care") setCares((p) => p.map((x) => x.id === updated.id ? updated as CareLog : x));
  }, []);

  if (catLoading) return <div className="min-h-screen bg-canvas" />;
  if (!cat) return <NoCatNotice />;
  if (loading) return <div className="min-h-screen bg-canvas" />;

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startDow = getDay(startOfMonth(month));
  const cells: (Date | null)[] = [...Array(startDow).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-stone-800">カレンダー</h1>
            <p className="text-[10px] text-stone-400">{catName(cat?.name)}の記録カレンダー</p>
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
            { color: "bg-primary", label: "ごはん" },
            { color: "bg-sky-300", label: "トイレ" },
            { color: "bg-emerald-300", label: "体重" },
            { color: "bg-violet-300", label: "お薬" },
            { color: "bg-amber-300", label: "ケア" },
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
          <div className="grid grid-cols-7 divide-x divide-y divide-stone-50">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="min-h-[52px] bg-stone-50/50" />;
                const key = format(day, "yyyy-MM-dd");
                const rec = records[key];
                const dow = getDay(day);
                const today = isToday(day);
                const hasAny = rec && (rec.feeding || rec.toilet || rec.weight || rec.medication || rec.care);
                return (
                  <button
                    key={key}
                    onClick={() => hasAny ? setSelectedDay(key) : undefined}
                    className={`min-h-[52px] p-1.5 flex flex-col text-left w-full transition-colors ${
                      today ? "bg-[#FFF5F4]" : ""
                    } ${hasAny ? "active:bg-stone-50" : ""}`}
                  >
                    <span className={`text-[11px] font-medium leading-none mb-1.5 ${
                      today ? "text-primary font-bold" :
                      dow === 0 ? "text-red-400" :
                      dow === 6 ? "text-sky-400" :
                      "text-stone-600"
                    }`}>
                      {format(day, "d")}
                    </span>
                    <div className="flex flex-wrap gap-0.5">
                      {rec?.feeding && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      {rec?.toilet && <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />}
                      {rec?.weight && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />}
                      {rec?.medication && <span className="w-1.5 h-1.5 rounded-full bg-violet-300" />}
                      {rec?.care && <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />}
                    </div>
                  </button>
                );
              })}
            </div>
        </div>
      </main>

      <DaySheet
        day={selectedDay}
        feedings={feedings}
        toilets={toilets}
        weights={weights}
        medications={medications}
        cares={cares}
        onClose={() => setSelectedDay(null)}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />

    </div>
  );
}

function buildTimestamp(originalIso: string, timeStr: string): string {
  const date = format(new Date(originalIso), "yyyy-MM-dd");
  const d = new Date(`${date}T${timeStr}:00.000+09:00`);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

// 編集フォームは <form> 外の button なので min/max が効かない。送信前に自前で範囲を見る
const EDIT_RANGES: Record<string, { min: number; max: number; label: string; unit: string }> = {
  amount: { min: 0.1, max: 2000, label: "量", unit: "g" },
  count: { min: 1, max: 20, label: "回数", unit: "回" },
  weight: { min: 0.01, max: 30, label: "体重", unit: "kg" },
};

// unitOverrides lets the feeding form say "ml" for milk instead of the default "g"
function validateEdit(body: Record<string, unknown>, unitOverrides?: Record<string, string>): string | null {
  for (const [key, value] of Object.entries(body)) {
    if (key.endsWith("At")) {
      if (typeof value !== "string" || value === "") return "時刻を入力してね";
      continue;
    }
    if (key === "name") {
      if (typeof value !== "string" || value.trim() === "") return "薬の名前を入力してね";
      continue;
    }
    const range = EDIT_RANGES[key];
    if (!range) continue;
    if (typeof value !== "number" || !isFinite(value)) return `${range.label}を入力してね`;
    if (value < range.min || value > range.max) {
      const unit = unitOverrides?.[key] ?? range.unit;
      return `${range.label}は ${range.min}〜${range.max}${unit} の範囲で入力してね`;
    }
  }
  return null;
}

function foodEmoji(foodType: string | null) {
  if (foodType === "ミルク") return "🥛";
  if (foodType === "おやつ") return "🍬";
  if (foodType === "ウェット") return "🍖";
  return "🥣";
}

type AnyLog = FeedingLog | ToiletLog | WeightLog | MedicationLog | CareLog;

function DaySheet({
  day, feedings, toilets, weights, medications, cares, onClose, onDelete, onUpdate,
}: {
  day: string | null;
  feedings: FeedingLog[];
  toilets: ToiletLog[];
  weights: WeightLog[];
  medications: MedicationLog[];
  cares: CareLog[];
  onClose: () => void;
  onDelete: (type: string, id: string) => void;
  onUpdate: (type: string, updated: AnyLog) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const open = day !== null;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { setEditingId(null); onClose(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // 別の日を開いたら編集状態をリセット
  useEffect(() => { setEditingId(null); }, [day]);

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
  const dayCares = cares.filter((x) => dateOf(x.doneAt) === day)
    .sort((a, b) => new Date(a.doneAt).getTime() - new Date(b.doneAt).getTime());

  const dateLabel = format(new Date(day), "M月d日(E)", { locale: ja });

  function startEdit(id: string, fields: Record<string, string>) {
    setEditingId(id);
    setEditFields(fields);
    setEditError(null);
  }

  async function saveEdit(apiType: string, id: string, body: Record<string, unknown>, unitOverrides?: Record<string, string>) {
    const invalid = validateEdit(body, unitOverrides);
    if (invalid) { setEditError(invalid); return; }

    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/${apiType}?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(apiType, updated);
        setEditingId(null);
      } else {
        const d = await res.json().catch(() => null);
        setEditError(d?.error ?? "保存できませんでした");
      }
    } catch {
      setEditError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(apiType: string, id: string) {
    if (!confirm("この記録を削除しますか？")) return;
    const res = await fetch(`/api/${apiType}?id=${id}`, { method: "DELETE" });
    if (res.ok) onDelete(apiType, id);
    else alert("記録を削除できませんでした。時間をおいて試してみてね");
  }

  const actionButtons = (apiType: string, id: string, onEdit: () => void) => (
    <div className="flex items-center gap-1 ml-1 shrink-0">
      <button
        onClick={onEdit}
        className="w-11 h-11 flex items-center justify-center text-stone-500 hover:text-stone-700 transition-colors text-sm"
        aria-label="編集"
      >✏</button>
      <button
        onClick={() => doDelete(apiType, id)}
        className="w-11 h-11 flex items-center justify-center text-stone-500 hover:text-red-500 transition-colors text-lg leading-none"
        aria-label="削除"
      >×</button>
    </div>
  );

  const editActions = (onSave: () => void) => (
    <>
      {editError && <p className="text-xs text-red-500 mt-2 pl-10">{editError}</p>}
      <div className="flex gap-2 mt-2 pl-10">
        <button
          onClick={onSave}
          disabled={saving}
          className="text-xs bg-primary text-white px-3 py-1 rounded-full disabled:opacity-50"
        >保存</button>
        <button onClick={() => { setEditingId(null); setEditError(null); }} className="text-xs text-stone-400 px-3 py-1">キャンセル</button>
      </div>
    </>
  );

  const inputCls = "border border-stone-200 rounded-lg px-2 py-1 text-sm text-stone-700 bg-white focus:outline-none focus:border-primary";

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/20 z-[55] transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => { setEditingId(null); onClose(); }}
      />

      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "70vh" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-200" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between border-b border-stone-100">
          <p className="text-sm font-bold text-stone-800">{dateLabel}</p>
          <button onClick={() => { setEditingId(null); onClose(); }} aria-label="閉じる" className="w-11 h-11 -m-2 flex items-center justify-center text-stone-500 hover:text-stone-700 transition-colors text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto pb-[72px]" style={{ maxHeight: "calc(70vh - 80px)" }}>
          {dayFeedings.length === 0 && dayToilets.length === 0 && dayWeights.length === 0 && dayMeds.length === 0 && dayCares.length === 0 ? (
            <p className="text-center text-sm text-stone-400 py-10">この日の記録はありません</p>
          ) : (() => {
            // サマリー計算
            const feedingGrouped: Record<string, number> = {};
            const feedingOthers: Record<string, number> = {};
            for (const f of dayFeedings) {
              const type = f.foodType;
              if (type && type !== "その他") {
                feedingGrouped[type] = (feedingGrouped[type] ?? 0) + f.amount;
              } else {
                const label = f.note?.trim() || "🥣";
                feedingOthers[label] = (feedingOthers[label] ?? 0) + f.amount;
              }
            }
            const urineCount = dayToilets.filter((t) => t.type === "URINE").reduce((s, t) => s + t.count, 0);
            const fecesCount = dayToilets.filter((t) => t.type === "FECES").reduce((s, t) => s + t.count, 0);
            const hasSummary = dayFeedings.length > 0 || dayToilets.length > 0;

            // 時間順ソート
            type TimeEntry =
              | { kind: "feeding"; time: number; data: FeedingLog }
              | { kind: "toilet"; time: number; data: ToiletLog }
              | { kind: "weight"; time: number; data: WeightLog }
              | { kind: "medication"; time: number; data: MedicationLog }
              | { kind: "care"; time: number; data: CareLog };

            const allEntries: TimeEntry[] = [
              ...dayFeedings.map((f) => ({ kind: "feeding" as const, time: new Date(f.fedAt).getTime(), data: f })),
              ...dayToilets.map((t) => ({ kind: "toilet" as const, time: new Date(t.loggedAt).getTime(), data: t })),
              ...dayWeights.map((w) => ({ kind: "weight" as const, time: new Date(w.measuredAt).getTime(), data: w })),
              ...dayMeds.map((m) => ({ kind: "medication" as const, time: new Date(m.givenAt).getTime(), data: m })),
              ...dayCares.map((c) => ({ kind: "care" as const, time: new Date(c.doneAt).getTime(), data: c })),
            ].sort((a, b) => a.time - b.time);

            return (
              <div>
                {/* サマリー */}
                {hasSummary && (
                  <div className="px-5 py-4 bg-stone-50/60 space-y-2">
                    {dayFeedings.length > 0 && (
                      <div className="flex items-baseline gap-3">
                        <span className="text-xs font-semibold text-stone-400 w-12 shrink-0">ごはん</span>
                        <div className="flex flex-col gap-0.5">
                          {Object.keys(feedingGrouped).length > 0 && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {Object.entries(feedingGrouped).map(([type, amount]) => {
                                const label = (type === "カリカリ" || type === "ウェット") ? type : foodEmoji(type);
                                const unit = type === "ミルク" ? "ml" : "g";
                                return (
                                  <span key={type} className="text-sm text-stone-700">
                                    {label}<span className="text-stone-400 ml-1">{amount}{unit}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {Object.keys(feedingOthers).length > 0 && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {Object.entries(feedingOthers).map(([label, amount]) => (
                                <span key={label} className="text-sm text-stone-700">
                                  {label}<span className="text-stone-400 ml-1">{amount}g</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {(urineCount > 0 || fecesCount > 0) && (
                      <div className="flex items-baseline gap-3">
                        <span className="text-xs font-semibold text-stone-400 w-12 shrink-0">トイレ</span>
                        <div className="flex gap-3">
                          {urineCount > 0 && (
                            <span className="text-sm text-stone-700">💧<span className="text-stone-400 ml-1">{urineCount}回</span></span>
                          )}
                          {fecesCount > 0 && (
                            <span className="text-sm text-stone-700">🌼<span className="text-stone-400 ml-1">{fecesCount}回</span></span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 区切り */}
                {hasSummary && <div className="border-t border-stone-100" />}

                {/* 時間順個別記録 */}
                <div className="divide-y divide-stone-50">
                  {allEntries.map((entry) => {
                    if (entry.kind === "feeding") {
                      const f = entry.data;
                      return (
                        <div key={f.id} className="px-5 py-3">
                          {editingId === f.id ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl w-7 text-center">{foodEmoji(f.foodType)}</span>
                                <input type="number" inputMode="decimal" min="0.1" step="0.1" value={editFields.amount ?? ""}
                                  onChange={(e) => setEditFields((p) => ({ ...p, amount: e.target.value }))}
                                  className={`w-20 ${inputCls}`} />
                                <span className="text-xs text-stone-400">{f.foodType === "ミルク" ? "ml" : "g"}</span>
                                <input type="time" value={editFields.time ?? ""}
                                  onChange={(e) => setEditFields((p) => ({ ...p, time: e.target.value }))}
                                  className={inputCls} />
                              </div>
                              {editActions(() => saveEdit("feeding", f.id, {
                                amount: parseFloat(editFields.amount),
                                fedAt: buildTimestamp(f.fedAt, editFields.time),
                              }, f.foodType === "ミルク" ? { amount: "ml" } : undefined))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
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
                              {actionButtons("feeding", f.id, () => startEdit(f.id, {
                                amount: String(f.amount),
                                time: format(new Date(f.fedAt), "HH:mm"),
                              }))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (entry.kind === "toilet") {
                      const t = entry.data;
                      return (
                        <div key={t.id} className="px-5 py-3">
                          {editingId === t.id ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl w-7 text-center">{t.type === "URINE" ? "💧" : "🌼"}</span>
                                <input type="number" inputMode="numeric" min="1" step="1" value={editFields.count ?? ""}
                                  onChange={(e) => setEditFields((p) => ({ ...p, count: e.target.value }))}
                                  className={`w-16 ${inputCls}`} />
                                <span className="text-xs text-stone-400">回</span>
                                <input type="time" value={editFields.time ?? ""}
                                  onChange={(e) => setEditFields((p) => ({ ...p, time: e.target.value }))}
                                  className={inputCls} />
                              </div>
                              {editActions(() => saveEdit("toilet", t.id, {
                                count: parseInt(editFields.count, 10),
                                loggedAt: buildTimestamp(t.loggedAt, editFields.time),
                              }))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="text-xl w-7 text-center">{t.type === "URINE" ? "💧" : "🌼"}</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-stone-700">
                                  {t.type === "URINE" ? "おしっこ" : "うんち"}
                                  <span className="text-xs font-normal text-stone-400 ml-1">{t.count}回</span>
                                </p>
                                <p className="text-xs text-stone-400">{t.user.name}</p>
                              </div>
                              <p className="text-xs text-stone-400 tabular-nums">{format(new Date(t.loggedAt), "HH:mm")}</p>
                              {actionButtons("toilet", t.id, () => startEdit(t.id, {
                                count: String(t.count),
                                time: format(new Date(t.loggedAt), "HH:mm"),
                              }))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (entry.kind === "weight") {
                      const w = entry.data;
                      return (
                        <div key={w.id} className="px-5 py-3">
                          {editingId === w.id ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl w-7 text-center">⚖️</span>
                                <input type="number" inputMode="decimal" min="0.01" step="0.01" value={editFields.weight ?? ""}
                                  onChange={(e) => setEditFields((p) => ({ ...p, weight: e.target.value }))}
                                  className={`w-20 ${inputCls}`} />
                                <span className="text-xs text-stone-400">kg</span>
                                <input type="time" value={editFields.time ?? ""}
                                  onChange={(e) => setEditFields((p) => ({ ...p, time: e.target.value }))}
                                  className={inputCls} />
                              </div>
                              {editActions(() => saveEdit("weight", w.id, {
                                weight: parseFloat(editFields.weight),
                                measuredAt: buildTimestamp(w.measuredAt, editFields.time),
                              }))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="text-xl w-7 text-center">⚖️</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-stone-700">
                                  {w.weight.toFixed(2)}<span className="text-xs font-normal text-stone-400 ml-0.5">kg</span>
                                </p>
                                <p className="text-xs text-stone-400">{w.user.name}</p>
                              </div>
                              <p className="text-xs text-stone-400 tabular-nums">{format(new Date(w.measuredAt), "HH:mm")}</p>
                              {actionButtons("weight", w.id, () => startEdit(w.id, {
                                weight: String(w.weight),
                                time: format(new Date(w.measuredAt), "HH:mm"),
                              }))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (entry.kind === "medication") {
                      const m = entry.data;
                      return (
                        <div key={m.id} className="px-5 py-3">
                          {editingId === m.id ? (
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xl w-7 text-center">💊</span>
                                <input type="text" value={editFields.name ?? ""}
                                  onChange={(e) => setEditFields((p) => ({ ...p, name: e.target.value }))}
                                  className={`flex-1 min-w-0 ${inputCls}`} placeholder="薬名" />
                                <input type="time" value={editFields.time ?? ""}
                                  onChange={(e) => setEditFields((p) => ({ ...p, time: e.target.value }))}
                                  className={inputCls} />
                              </div>
                              {editActions(() => saveEdit("medication", m.id, {
                                name: editFields.name,
                                givenAt: buildTimestamp(m.givenAt, editFields.time),
                              }))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="text-xl w-7 text-center">💊</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-stone-700">
                                  {m.name}
                                  {m.dosage && <span className="text-xs font-normal text-stone-400 ml-1">{m.dosage}</span>}
                                </p>
                                <p className="text-xs text-stone-400">{m.user.name}</p>
                              </div>
                              <p className="text-xs text-stone-400 tabular-nums">{format(new Date(m.givenAt), "HH:mm")}</p>
                              {actionButtons("medication", m.id, () => startEdit(m.id, {
                                name: m.name,
                                time: format(new Date(m.givenAt), "HH:mm"),
                              }))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    // care
                    const c = entry.data as CareLog;
                    return (
                      <div key={c.id} className="px-5 py-3">
                        {editingId === c.id ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl w-7 text-center">🐾</span>
                              <span className="text-sm text-stone-600">{c.type}</span>
                              <input type="time" value={editFields.time ?? ""}
                                onChange={(e) => setEditFields((p) => ({ ...p, time: e.target.value }))}
                                className={inputCls} />
                            </div>
                            {editActions(() => saveEdit("care", c.id, {
                              doneAt: buildTimestamp(c.doneAt, editFields.time),
                            }))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-xl w-7 text-center">🐾</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-stone-700">{c.type}</p>
                              <p className="text-xs text-stone-400">{c.user.name}</p>
                            </div>
                            <p className="text-xs text-stone-400 tabular-nums">{format(new Date(c.doneAt), "HH:mm")}</p>
                            {actionButtons("care", c.id, () => startEdit(c.id, {
                              time: format(new Date(c.doneAt), "HH:mm"),
                            }))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
