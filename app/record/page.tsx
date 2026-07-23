"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toJstIso, todayJst, nowTimeJst } from "@/lib/datetime";
import { CARE_GROUPS, resolveCycle, type CareCycles } from "@/lib/care";
import NoCatNotice from "@/components/NoCatNotice";
import Link from "next/link";

interface Cat { id: string; name: string; careCycles?: CareCycles | null }
type Tab = "feeding" | "toilet" | "weight" | "care";

const TABS: { key: Tab; emoji: string; label: string }[] = [
  { key: "feeding", emoji: "🍚", label: "ごはん" },
  { key: "toilet", emoji: "🚿", label: "トイレ" },
  { key: "weight", emoji: "⚖️", label: "体重" },
  { key: "care", emoji: "🐾", label: "ケア" },
];

export default function RecordPage() {
  const [tab, setTab] = useState<Tab>("feeding");
  const [cat, setCat] = useState<Cat | null>(null);
  const [catLoading, setCatLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cat")
      .then((r) => r.json())
      .then((cats) => setCat(cats[0] ?? null))
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, []);

  if (catLoading) return <div className="min-h-screen bg-canvas" />;
  if (!cat) return <NoCatNotice />;

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-stone-800">記録する</h1>
          <p className="text-[10px] text-stone-400">{cat.name}の今日を残しておこう</p>
        </div>
      </header>

      <div className="bg-white border-b border-stone-100 sticky top-[53px] z-30">
        <div className="max-w-lg mx-auto flex">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors text-[11px] font-medium border-b-2 ${
                tab === t.key
                  ? "text-primary border-primary"
                  : "text-stone-400 border-transparent"
              }`}
            >
              <span className="text-lg">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 pt-5">
        {tab === "feeding" && <FeedingForm cat={cat} />}
        {tab === "toilet" && <ToiletForm cat={cat} />}
        {tab === "weight" && <WeightForm cat={cat} />}
        {tab === "care" && <CareForm cat={cat} />}
      </main>

    </div>
  );
}

const FOOD_TYPES = [
  { key: "カリカリ", emoji: "🥣" },
  { key: "ウェット", emoji: "🍖" },
  { key: "ミルク", emoji: "🥛" },
  { key: "おやつ", emoji: "🍬" },
  { key: "その他", emoji: "🍽️" },
];
const PRESETS: Record<string, number[]> = {
  ミルク: [5, 10, 15],
  おやつ: [2, 5, 10],
  default: [5, 10, 15, 20],
};
function getPresets(foodType: string) {
  return PRESETS[foodType] ?? PRESETS.default;
}

function FeedingForm({ cat }: { cat: Cat }) {
  const [foodType, setFoodType] = useState("カリカリ");
  const [amount, setAmount] = useState("");
  const [fedDate, setFedDate] = useState(todayJst());
  const [fedAt, setFedAt] = useState(nowTimeJst());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    const iso = toJstIso(fedDate, fedAt);
    if (!iso) { setError("日付と時刻を確認してね"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/feeding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catId: cat.id,
          foodType,
          amount: Number(amount),
          fedAt: iso,
          note,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { setSuccess(false); setAmount(""); setNote(""); }, 1500);
      } else {
        const d = await res.json();
        setError(d.error ?? "エラーが発生しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  if (success) return <SuccessBanner emoji="🥣" message="ごはんを記録したよ！" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card p-5 space-y-3">
        <label className="block text-xs font-semibold text-stone-400 text-center">種類</label>
        <div className="grid grid-cols-5 gap-2">
          {FOOD_TYPES.map((ft) => (
            <button
              key={ft.key}
              type="button"
              onClick={() => setFoodType(ft.key)}
              className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95 border-2 ${
                foodType === ft.key ? "border-primary bg-stone-50" : "border-stone-100 bg-white"
              }`}
            >
              <span className="text-2xl">{ft.emoji}</span>
              <span className={`text-[10px] font-semibold ${foodType === ft.key ? "text-primary" : "text-stone-400"}`}>{ft.key}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <label className="block text-xs font-semibold text-stone-400 mb-1 text-center">
          給餌量（{foodType === "ミルク" ? "ml" : "g"}）
        </label>
        <input
          type="number" inputMode="numeric" min={1} max={500} step={1} value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full border-0 bg-stone-50 rounded-2xl px-4 py-4 text-4xl font-bold text-center text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder-stone-200"
          required autoFocus
        />
        <div className={`grid gap-2 ${getPresets(foodType).length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
          {getPresets(foodType).map((g) => (
            <button key={g} type="button" onClick={() => setAmount(String(g))}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 border ${
                amount === String(g) ? "bg-primary text-white border-primary" : "bg-white text-stone-600 border-stone-200"
              }`}
            >{g}{foodType === "ミルク" ? "ml" : "g"}</button>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-[1.4fr_1fr] gap-3 [&>*]:min-w-0">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">日付</label>
            <input type="date" max={todayJst()} value={fedDate} onChange={(e) => setFedDate(e.target.value)} className="input" required />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">時刻</label>
            <input type="time" step={300} value={fedAt} onChange={(e) => setFedAt(e.target.value)} className="input" required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">メモ（任意）</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={foodType === "その他" ? "絵文字を入力 🥦 🍠 🐓 🐟️ など" : "完食、残しあり など"} className="input" />
        </div>
      </div>

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
      <button type="submit" disabled={saving || !amount} className="btn-primary w-full py-4 text-base">
        {saving ? "記録中..." : "記録する"}
      </button>
    </form>
  );
}

function ToiletForm({ cat }: { cat: Cat }) {
  const [type, setType] = useState<"URINE" | "FECES">("URINE");
  const [count, setCount] = useState(1);
  const [condition, setCondition] = useState("");
  const [loggedDate, setLoggedDate] = useState(todayJst());
  const [loggedAt, setLoggedAt] = useState(nowTimeJst());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const iso = toJstIso(loggedDate, loggedAt);
    if (!iso) { setError("日付と時刻を確認してね"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/toilet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catId: cat.id, type, count, condition,
          loggedAt: iso,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { setSuccess(false); setCount(1); setCondition(""); }, 1500);
      } else {
        const d = await res.json();
        setError(d.error ?? "エラーが発生しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  if (success) return <SuccessBanner emoji={type === "URINE" ? "💧" : "🌼"} message="トイレを記録したよ！" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card p-5 space-y-3">
        <label className="block text-xs font-semibold text-stone-400 text-center">種類</label>
        <div className="grid grid-cols-2 gap-3">
          {([["URINE", "💧", "おしっこ"], ["FECES", "🌼", "うんち"]] as const).map(([t, emoji]) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`py-6 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 border-2 ${
                type === t ? "border-primary bg-stone-50" : "border-stone-100 bg-white"
              }`}
            >
              <span className="text-4xl">{emoji}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <label className="block text-xs font-semibold text-stone-400 mb-4 text-center">回数</label>
        <div className="flex items-center justify-center gap-8">
          <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))}
            className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 text-xl font-bold hover:bg-stone-200 transition-colors active:scale-95 transform flex items-center justify-center">−</button>
          <span className="text-5xl font-bold text-stone-800 w-16 text-center tabular-nums">{count}</span>
          <button type="button" onClick={() => setCount((c) => c + 1)}
            className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 text-xl font-bold hover:bg-stone-200 transition-colors active:scale-95 transform flex items-center justify-center">＋</button>
        </div>
        <p className="text-center text-xs text-stone-400 mt-2">回</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-[1.4fr_1fr] gap-3 [&>*]:min-w-0">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">日付</label>
            <input type="date" max={todayJst()} value={loggedDate} onChange={(e) => setLoggedDate(e.target.value)} className="input" required />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">時刻</label>
            <input type="time" step={300} value={loggedAt} onChange={(e) => setLoggedAt(e.target.value)} className="input" required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">状態メモ（任意）</label>
          <input type="text" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="いつもより多い、色が違う など" className="input" />
        </div>
      </div>

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary w-full py-4 text-base">
        {saving ? "記録中..." : "記録する"}
      </button>
    </form>
  );
}

function WeightForm({ cat }: { cat: Cat }) {
  const [weight, setWeight] = useState("");
  const [measuredDate, setMeasuredDate] = useState(todayJst());
  const [measuredAt, setMeasuredAt] = useState(nowTimeJst());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const iso = toJstIso(measuredDate, measuredAt);
    if (!iso) { setError("日付と時刻を確認してね"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catId: cat.id, weight: Number(weight),
          measuredAt: iso,
          note,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { setSuccess(false); setWeight(""); setNote(""); }, 1500);
      } else {
        const d = await res.json();
        setError(d.error ?? "エラーが発生しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  if (success) return <SuccessBanner emoji="⚖️" message="体重を記録したよ！" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card p-5">
        <label className="block text-xs font-semibold text-stone-400 mb-3 text-center">体重（kg）</label>
        <input
          type="number" inputMode="decimal" min={0.1} max={20} step={0.01} value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="0.00"
          className="w-full border-0 bg-stone-50 rounded-2xl px-4 py-4 text-4xl font-bold text-center text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder-stone-200"
          required autoFocus
        />
        <p className="text-center text-xs text-stone-400 mt-2">kg</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-[1.4fr_1fr] gap-3 [&>*]:min-w-0">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">計測日</label>
            <input type="date" max={todayJst()} value={measuredDate} onChange={(e) => setMeasuredDate(e.target.value)} className="input" required />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">計測時刻</label>
            <input type="time" step={300} value={measuredAt} onChange={(e) => setMeasuredAt(e.target.value)} className="input" required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">メモ（任意）</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="食後、空腹時 など" className="input" />
        </div>
      </div>

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
      <button type="submit" disabled={saving || !weight} className="btn-primary w-full py-4 text-base">
        {saving ? "記録中..." : "記録する"}
      </button>
    </form>
  );
}

function SuccessBanner({ emoji, message }: { emoji: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <span className="text-6xl animate-bounce">{emoji}</span>
      <p className="text-base font-bold text-stone-700">{message}</p>
    </div>
  );
}

// ── ケア ──────────────────────────────────────────

interface CareLog { id: string; type: string; doneAt: string; user: { name: string } }

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

const CARE_GROUPS_UPPER = CARE_GROUPS.slice(0, 2);
const CARE_GROUPS_LOWER = CARE_GROUPS.slice(2);

function CareForm({ cat }: { cat: Cat }) {
  const [lastRecords, setLastRecords] = useState<Record<string, CareLog>>({});
  const [recording, setRecording] = useState<Record<string, boolean>>({});
  const [justDone, setJustDone] = useState<Record<string, boolean>>({});

  const [medOpen, setMedOpen] = useState(false);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medGivenDate, setMedGivenDate] = useState(todayJst());
  const [medGivenAt, setMedGivenAt] = useState(nowTimeJst());
  const [medSaving, setMedSaving] = useState(false);
  const [medJustDone, setMedJustDone] = useState(false);
  const [lastMed, setLastMed] = useState<{ name: string; givenAt: string } | null>(null);

  useEffect(() => {
    fetch(`/api/care?catId=${cat.id}&limit=100`)
      .then((r) => r.json())
      .then((logs: CareLog[]) => {
        const map: Record<string, CareLog> = {};
        for (const log of logs) {
          if (!map[log.type]) map[log.type] = log;
        }
        setLastRecords(map);
      });
    fetch(`/api/medication?catId=${cat.id}&limit=1`)
      .then((r) => r.json())
      .then((logs) => {
        if (Array.isArray(logs) && logs[0]) setLastMed({ name: logs[0].name, givenAt: logs[0].givenAt });
      })
      .catch(() => {});
  }, [cat.id]);

  async function recordMedication() {
    if (medSaving || !medName) return;
    const iso = toJstIso(medGivenDate, medGivenAt);
    if (!iso) { alert("投薬日と時刻を確認してね"); return; }
    setMedSaving(true);
    try {
      const res = await fetch("/api/medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catId: cat.id,
          name: medName,
          dosage: medDosage || undefined,
          givenAt: iso,
        }),
      });
      if (res.ok) {
        const log = await res.json();
        setLastMed({ name: log.name, givenAt: log.givenAt });
        setMedJustDone(true);
        setMedOpen(false);
        setMedName("");
        setMedDosage("");
        setTimeout(() => setMedJustDone(false), 1500);
      }
    } finally {
      setMedSaving(false);
    }
  }

  async function record(type: string) {
    if (recording[type]) return;
    setRecording((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catId: cat.id, type, doneAt: new Date().toISOString() }),
      });
      if (res.ok) {
        const newLog: CareLog = await res.json();
        setLastRecords((prev) => ({ ...prev, [type]: newLog }));
        setJustDone((prev) => ({ ...prev, [type]: true }));
        setTimeout(() => setJustDone((prev) => ({ ...prev, [type]: false })), 1500);
      }
    } finally {
      setRecording((prev) => ({ ...prev, [type]: false }));
    }
  }

  function lastLabel(type: string, cycle?: number): { text: string; overdue: boolean; nextDue?: string } {
    const log = lastRecords[type];
    if (!log) return { text: "未記録", overdue: !!cycle };
    const days = daysSince(log.doneAt);
    const overdue = !!cycle && days > cycle;
    let nextDue: string | undefined;
    if (cycle) {
      const d = new Date(log.doneAt);
      d.setDate(d.getDate() + cycle);
      nextDue = `${d.getMonth() + 1}月${d.getDate()}日`;
    }
    if (days === 0) return { text: "今日", overdue: false, nextDue };
    return { text: `${days}日前`, overdue, nextDue };
  }

  const careGroup = (group: typeof CARE_GROUPS[number]) => (
    <div key={group.label}>
      <p className="text-xs font-semibold text-stone-400 mb-2 px-1">{group.label}</p>
      <div className="card overflow-hidden divide-y divide-stone-50">
        {group.items.map((item) => {
          const done = justDone[item.key];
          const cycle = resolveCycle(item, cat.careCycles);
          const { text, overdue, nextDue } = lastLabel(item.key, cycle);
          return (
            <div key={item.key} className="px-4 py-3 flex items-center gap-3">
              <span className="text-xl w-7 text-center">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700">{item.key}</p>
                <p className={`text-xs ${overdue ? "text-amber-400 font-medium" : "text-stone-400"}`}>
                  {nextDue
                    ? `次回 ${nextDue}${overdue ? "・超過" : ""}`
                    : text + (cycle ? `（${cycle}日ごと）` : "")}
                </p>
              </div>
              <button
                onClick={() => record(item.key)}
                disabled={recording[item.key]}
                className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all active:scale-95 flex-shrink-0 after:absolute after:content-[''] after:-inset-1.5 ${
                  done
                    ? "bg-emerald-100 text-emerald-500"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                }`}
              >
                {done ? "✓" : "+"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const medLastText = lastMed
    ? `最終: ${daysSince(lastMed.givenAt) === 0 ? "今日" : `${daysSince(lastMed.givenAt)}日前`} · ${lastMed.name}`
    : "未記録";

  return (
    <div className="space-y-4 pb-4">
      {CARE_GROUPS_UPPER.map(careGroup)}

      {/* 医療的ケア */}
      <div>
        <p className="text-xs font-semibold text-stone-400 mb-2 px-1">医療的ケア</p>
        <div className="card overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3">
            <span className="text-xl w-7 text-center">💊</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-700">お薬</p>
              <p className="text-xs text-stone-400">
                {medLastText}
                <Link href="/medication" className="text-primary ml-2 hover:underline">履歴を見る</Link>
              </p>
            </div>
            <button
              onClick={() => setMedOpen((p) => !p)}
              className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all active:scale-95 flex-shrink-0 after:absolute after:content-[''] after:-inset-1.5 ${
                medJustDone
                  ? "bg-emerald-100 text-emerald-500"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              {medJustDone ? "✓" : medOpen ? "−" : "+"}
            </button>
          </div>
          {medOpen && (
            <div className="px-4 pb-4 pt-3 border-t border-stone-50 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">薬名</label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="アモキシシリン など"
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">用量（任意）</label>
                <input
                  type="text"
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                  placeholder="1錠、0.5ml など"
                  className="input"
                />
              </div>
              <div className="grid grid-cols-[1.4fr_1fr] gap-3 [&>*]:min-w-0">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-stone-400 mb-1">投薬日</label>
                  <input
                    type="date"
                    max={todayJst()}
                    value={medGivenDate}
                    onChange={(e) => setMedGivenDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-stone-400 mb-1">投薬時刻</label>
                  <input
                    type="time"
                    step={300}
                    value={medGivenAt}
                    onChange={(e) => setMedGivenAt(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              <button
                onClick={recordMedication}
                disabled={medSaving || !medName}
                className="btn-primary w-full py-3 text-sm"
              >
                {medSaving ? "記録中..." : "記録する"}
              </button>
            </div>
          )}
        </div>
      </div>

      {CARE_GROUPS_LOWER.map(careGroup)}
    </div>
  );
}
