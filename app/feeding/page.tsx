"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { BottomNav } from "@/components/BottomNav";

interface Cat { id: string; name: string }

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

const MESSAGES = [
  "何を何グラム食べたかな？",
  "今日もたびのごはん、ありがとう",
  "完食してくれたかな？",
  "おなかすいてた？",
  "今日もおいしく食べられたかな",
  "いっぱい食べて元気でいてね",
  "たびのごはんの時間、ほっとするよね",
  "残さず食べてくれたかな",
  "食欲はあった？",
  "モリモリ食べてくれたかな",
  "ごはん、喜んでた？",
  "いつもと同じくらい食べた？",
  "好きなごはんだった？",
  "ゆっくり食べてたかな",
  "ちゃんとお腹いっぱいになったかな",
  "今日のごはんはどんな感じだった？",
  "たびのごはん姿、かわいいよね",
  "食べる顔、見てた？",
  "今日の分、しっかり食べた？",
  "ごはんの時間、楽しみにしてたかな",
  "たびのおなか、満たせたかな？",
  "毎日のごはん記録、続けてるね",
  "今日もたびのそばにいてくれてありがとう",
  "食べムラはなかった？",
  "ちゃんと水も飲んでた？",
  "今日もいい子だった？",
  "ごはん中のたびの顔、想像しただけで笑顔になる",
  "毎日の積み重ね、ちゃんと残してるね",
  "たびが元気でいてくれるの、ありがとう",
  "今日もたびのご飯係、お疲れさま",
];

export default function FeedingPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  useEffect(() => { setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]); }, []);
  const [cat, setCat] = useState<Cat | null>(null);
  const [foodType, setFoodType] = useState("カリカリ");
  const [amount, setAmount] = useState("");
  const [fedAt, setFedAt] = useState(format(new Date(), "HH:mm"));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cat").then((r) => r.json()).then((cats) => setCat(cats[0] ?? null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cat || !amount) return;
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
        setTimeout(() => router.push("/"), 1800);
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

  if (success) {
    const ft = FOOD_TYPES.find((f) => f.key === foodType);
    return (
      <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center">
        <div className="text-center space-y-4 px-8">
          <div className="text-6xl animate-bounce">{ft?.emoji ?? "🥣"}</div>
          <p className="text-lg font-bold text-stone-700">記録したよ！</p>
          <p className="text-sm text-stone-400 leading-relaxed">
            たびの{foodType}、ちゃんと食べてくれたかな？<br />
            毎日の積み重ねが大切だよ 🐾
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] pb-24">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-sm transition-colors">
            ← 戻る
          </button>
          <div>
            <h1 className="text-base font-bold text-stone-800">たびのごはん</h1>
            <p className="text-[10px] text-stone-400">{message}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 食べ物の種類 */}
          <div className="card p-5 space-y-3">
            <label className="block text-xs font-semibold text-stone-400 text-center">種類</label>
            <div className="grid grid-cols-5 gap-2">
              {FOOD_TYPES.map((ft) => (
                <button
                  key={ft.key}
                  type="button"
                  onClick={() => setFoodType(ft.key)}
                  className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95 border-2 ${
                    foodType === ft.key
                      ? "border-[#F69F9A] bg-stone-50"
                      : "border-stone-100 bg-white hover:border-stone-200"
                  }`}
                >
                  <span className="text-2xl">{ft.emoji}</span>
                  <span className={`text-[10px] font-semibold ${foodType === ft.key ? "text-[#F69F9A]" : "text-stone-400"}`}>
                    {ft.key}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 給餌量 */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-3 text-center">
                給餌量（{foodType === "ミルク" ? "ml" : "g"}）
              </label>
              <input
                type="number"
                min={1}
                max={500}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full border-0 bg-stone-50 rounded-2xl px-4 py-4 text-4xl font-bold text-center text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder-stone-200"
                required
                autoFocus
              />
            </div>
            <div className={`grid gap-2 ${getPresets(foodType).length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
              {getPresets(foodType).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setAmount(String(g))}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 border ${
                    amount === String(g)
                      ? "bg-[#F69F9A] text-white border-[#F69F9A]"
                      : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  {g}{foodType === "ミルク" ? "ml" : "g"}
                </button>
              ))}
            </div>
          </div>

          {/* 時刻・メモ */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">時刻</label>
              <input
                type="time"
                step={600}
                value={fedAt}
                onChange={(e) => setFedAt(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">メモ（任意）</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="完食、残しあり、嬉しそうだった など"
                className="input"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button type="submit" disabled={saving || !amount} className="btn-primary w-full py-4 text-base">
            {saving ? "記録中..." : "記録する"}
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
