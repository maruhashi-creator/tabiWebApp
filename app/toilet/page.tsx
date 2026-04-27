"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { BottomNav } from "@/components/BottomNav";

interface Cat { id: string; name: string }

export default function ToiletPage() {
  const router = useRouter();
  const [cat, setCat] = useState<Cat | null>(null);
  const [type, setType] = useState<"URINE" | "FECES">("URINE");
  const [count, setCount] = useState(1);
  const [condition, setCondition] = useState("");
  const [loggedAt, setLoggedAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cat").then((r) => r.json()).then((cats) => setCat(cats[0] ?? null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cat) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/toilet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catId: cat.id, type, count, condition, loggedAt }),
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
    return (
      <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center">
        <div className="text-center space-y-4 px-8">
          <div className="text-6xl animate-bounce">{type === "URINE" ? "💧" : "🌼"}</div>
          <p className="text-lg font-bold text-stone-700">記録したよ！</p>
          <p className="text-sm text-stone-400 leading-relaxed whitespace-pre-line">
            {type === "URINE"
              ? "おしっこ、ちゃんとできたんだね。\nたびは元気そうだね 🐱"
              : "うんち、できてよかった！\n健康のバロメーターだよ 🐾"}
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
            <h1 className="text-base font-bold text-stone-800">たびのトイレ</h1>
            <p className="text-[10px] text-stone-400">今日のトイレはどうだったかな？</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 種類 */}
          <div className="card p-5 space-y-3">
            <label className="block text-xs font-semibold text-stone-400 text-center">種類</label>
            <div className="grid grid-cols-2 gap-3">
              {([["URINE", "💧", "おしっこ"], ["FECES", "🌼", "うんち"]] as const).map(([t, emoji, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-6 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 border-2 ${
                    type === t
                      ? "border-[#F69F9A] bg-stone-50"
                      : "border-stone-100 bg-white hover:border-stone-200"
                  }`}
                >
                  <span className="text-4xl">{emoji}</span>
                  <span className={`text-sm font-bold ${type === t ? "text-[#F69F9A]" : "text-stone-400"}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 回数 */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-stone-400 mb-4 text-center">回数</label>
            <div className="flex items-center justify-center gap-8">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 text-xl font-bold hover:bg-stone-200 transition-colors active:scale-95 transform flex items-center justify-center"
              >
                −
              </button>
              <span className="text-5xl font-bold text-stone-800 w-16 text-center tabular-nums">{count}</span>
              <button
                type="button"
                onClick={() => setCount((c) => c + 1)}
                className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 text-xl font-bold hover:bg-stone-200 transition-colors active:scale-95 transform flex items-center justify-center"
              >
                ＋
              </button>
            </div>
            <p className="text-center text-xs text-stone-300 mt-2">回</p>
          </div>

          {/* 時刻・メモ */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">時刻</label>
              <input
                type="datetime-local"
                value={loggedAt}
                onChange={(e) => setLoggedAt(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">状態メモ（任意）</label>
              <input
                type="text"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="色、量、軟便、いつもより多かった など"
                className="input"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full py-4 text-base">
            {saving ? "記録中..." : "記録する"}
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
