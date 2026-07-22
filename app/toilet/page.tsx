"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toJstIso, todayJst, nowTimeJst } from "@/lib/datetime";
import { withCatName } from "@/lib/messages";

interface Cat { id: string; name: string }

const MESSAGES = [
  "今日のトイレはどうだったかな？",
  "ちゃんとできてたかな？",
  "健康のバロメーターだよ",
  "いつもと違う様子はなかった？",
  "今日も元気に過ごせたかな",
  "きれいに出せたかな？",
  "回数はいつも通り？",
  "トイレの様子、チェックしてあげてね",
  "色や量に変化はなかった？",
  "体の調子を教えてくれてるんだよ",
  "砂のかき方はいつも通りだった？",
  "トイレ後、すっきりしてたかな",
  "今日もトイレできてよかったね",
  "毎日のチェックが大切だよ",
  "見守ってくれてありがとう",
  "いつも気にかけてくれてるんだね",
  "定期的な確認が安心につながるよ",
  "何か気になることはあった？",
  "{name}の健康、守ってあげてね",
  "今日もしっかりチェックできたね",
  "毎日見てるから変化に気づけるよ",
  "ちょっとした変化も記録しておこう",
  "いつもと変わらない日常が一番だよね",
  "体の中から{name}の健康を守ろう",
  "記録が積み重なると安心感が違うよ",
  "{name}のこと、よく見てるね",
  "何気ない日常を大切にしてるんだね",
  "今日も{name}のそばにいてくれてありがとう",
  "健やかな毎日が続きますように",
  "今日も{name}のお世話、お疲れさま",
];

export default function ToiletPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  useEffect(() => { setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]); }, []);
  const [cat, setCat] = useState<Cat | null>(null);
  const [type, setType] = useState<"URINE" | "FECES">("URINE");
  const [count, setCount] = useState(1);
  const [condition, setCondition] = useState("");
  const [loggedDate, setLoggedDate] = useState(todayJst());
  const [loggedAt, setLoggedAt] = useState(nowTimeJst());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cat").then((r) => r.json()).then((cats) => setCat(cats[0] ?? null)).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cat) return;
    const iso = toJstIso(loggedDate, loggedAt);
    if (!iso) { setError("日付と時刻を確認してね"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/toilet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catId: cat.id,
          type,
          count,
          condition,
          loggedAt: iso,
        }),
      });
      if (res.ok) {
        setCount(1);
        setCondition("");
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
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

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-sm transition-colors">
            ← 戻る
          </button>
          <div>
            <h1 className="text-base font-bold text-stone-800">{(cat?.name ?? "ねこ")}のトイレ</h1>
            <p className="text-[10px] text-stone-400">{withCatName(message, cat?.name)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 種類 */}
          <div className="card p-5 space-y-3">
            <label className="block text-xs font-semibold text-stone-400 text-center">種類</label>
            <div className="grid grid-cols-2 gap-3">
              {([["URINE", "💧"], ["FECES", "🌼"]] as const).map(([t, emoji]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-6 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 border-2 ${
                    type === t
                      ? "border-primary bg-stone-50"
                      : "border-stone-100 bg-white hover:border-stone-200"
                  }`}
                >
                  <span className="text-4xl">{emoji}</span>
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
            <p className="text-center text-xs text-stone-400 mt-2">回</p>
          </div>

          {/* 日時・メモ */}
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-[1.4fr_1fr] gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-stone-400 mb-1.5">日付</label>
                <input
                  type="date"
                  max={todayJst()}
                  value={loggedDate}
                  onChange={(e) => setLoggedDate(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-stone-400 mb-1.5">時刻</label>
                <input
                  type="time"
                  step={300}
                  value={loggedAt}
                  onChange={(e) => setLoggedAt(e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">状態メモ（任意）</label>
              <input
                type="text"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="いつもより多い、少ない、色が違う など"
                className="input"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {saved && (
            <div className="card p-4 flex items-center gap-3">
              <span className="text-2xl">{type === "URINE" ? "💧" : "🌼"}</span>
              <div>
                <p className="text-sm font-bold text-stone-700">記録したよ！</p>
                <p className="text-xs text-stone-400">続けて記録できるよ 🐾</p>
              </div>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full py-4 text-base">
            {saving ? "記録中..." : "記録する"}
          </button>
        </form>
      </main>

    </div>
  );
}
