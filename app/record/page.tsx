"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { BottomNav } from "@/components/BottomNav";

interface Cat { id: string; name: string }
type Tab = "feeding" | "toilet" | "weight" | "medication";

const TABS: { key: Tab; emoji: string; label: string }[] = [
  { key: "feeding", emoji: "🍚", label: "ごはん" },
  { key: "toilet", emoji: "🚿", label: "トイレ" },
  { key: "weight", emoji: "⚖️", label: "体重" },
  { key: "medication", emoji: "💊", label: "お薬" },
];

export default function RecordPage() {
  const [tab, setTab] = useState<Tab>("feeding");
  const [cat, setCat] = useState<Cat | null>(null);

  useEffect(() => {
    fetch("/api/cat").then((r) => r.json()).then((cats) => setCat(cats[0] ?? null));
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F5F2] pb-24">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-stone-800">記録する</h1>
          <p className="text-[10px] text-stone-400">たびの今日を残しておこう</p>
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
                  ? "text-[#F69F9A] border-[#F69F9A]"
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
        {!cat && (
          <div className="text-center py-12 text-stone-300 text-sm">読み込み中...</div>
        )}
        {cat && tab === "feeding" && <FeedingForm cat={cat} />}
        {cat && tab === "toilet" && <ToiletForm cat={cat} />}
        {cat && tab === "weight" && <WeightForm cat={cat} />}
        {cat && tab === "medication" && <MedicationForm cat={cat} />}
      </main>

      <BottomNav />
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
const PRESETS = [5, 10, 15, 20];

function FeedingForm({ cat }: { cat: Cat }) {
  const [foodType, setFoodType] = useState("カリカリ");
  const [amount, setAmount] = useState("");
  const [fedAt, setFedAt] = useState(format(new Date(), "HH:mm"));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
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
          fedAt: new Date(`${format(new Date(), "yyyy-MM-dd")}T${fedAt}:00+09:00`).toISOString(),
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
                foodType === ft.key ? "border-[#F69F9A] bg-stone-50" : "border-stone-100 bg-white"
              }`}
            >
              <span className="text-2xl">{ft.emoji}</span>
              <span className={`text-[10px] font-semibold ${foodType === ft.key ? "text-[#F69F9A]" : "text-stone-400"}`}>{ft.key}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <label className="block text-xs font-semibold text-stone-400 mb-1 text-center">
          給餌量（{foodType === "ミルク" ? "ml" : "g"}）
        </label>
        <input
          type="number" min={1} max={500} step={1} value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full border-0 bg-stone-50 rounded-2xl px-4 py-4 text-4xl font-bold text-center text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder-stone-200"
          required autoFocus
        />
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((g) => (
            <button key={g} type="button" onClick={() => setAmount(String(g))}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 border ${
                amount === String(g) ? "bg-[#F69F9A] text-white border-[#F69F9A]" : "bg-white text-stone-600 border-stone-200"
              }`}
            >{g}{foodType === "ミルク" ? "ml" : "g"}</button>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">時刻</label>
          <input type="time" step={600} value={fedAt} onChange={(e) => setFedAt(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">メモ（任意）</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="完食、残しあり など" className="input" />
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
  const [loggedAt, setLoggedAt] = useState(format(new Date(), "HH:mm"));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/toilet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catId: cat.id, type, count, condition,
          loggedAt: new Date(`${format(new Date(), "yyyy-MM-dd")}T${loggedAt}:00+09:00`).toISOString(),
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
                type === t ? "border-[#F69F9A] bg-stone-50" : "border-stone-100 bg-white"
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
        <p className="text-center text-xs text-stone-300 mt-2">回</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">時刻</label>
          <input type="time" step={600} value={loggedAt} onChange={(e) => setLoggedAt(e.target.value)} className="input" required />
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
  const [measuredAt, setMeasuredAt] = useState(format(new Date(), "HH:mm"));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catId: cat.id, weight: Number(weight),
          measuredAt: new Date(`${format(new Date(), "yyyy-MM-dd")}T${measuredAt}:00+09:00`).toISOString(),
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
          type="number" min={0.1} max={20} step={0.01} value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="0.00"
          className="w-full border-0 bg-stone-50 rounded-2xl px-4 py-4 text-4xl font-bold text-center text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder-stone-200"
          required autoFocus
        />
        <p className="text-center text-xs text-stone-300 mt-2">kg</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">計測時刻</label>
          <input type="time" step={600} value={measuredAt} onChange={(e) => setMeasuredAt(e.target.value)} className="input" required />
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

function MedicationForm({ cat }: { cat: Cat }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [givenAt, setGivenAt] = useState(format(new Date(), "HH:mm"));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catId: cat.id, name, dosage: dosage || undefined,
          givenAt: new Date(`${format(new Date(), "yyyy-MM-dd")}T${givenAt}:00+09:00`).toISOString(),
          note: note || undefined,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { setSuccess(false); setName(""); setDosage(""); setNote(""); }, 1500);
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

  if (success) return <SuccessBanner emoji="💊" message="お薬を記録したよ！" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">薬名</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="アモキシシリン など" className="input" required autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">用量（任意）</label>
          <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)}
            placeholder="1錠、0.5ml など" className="input" />
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">投薬時刻</label>
          <input type="time" step={600} value={givenAt} onChange={(e) => setGivenAt(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">メモ（任意）</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="嫌がった、おやつに混ぜた など" className="input" />
        </div>
      </div>

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
      <button type="submit" disabled={saving || !name} className="btn-primary w-full py-4 text-base">
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
