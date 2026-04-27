"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { BottomNav } from "@/components/BottomNav";

interface Cat { id: string; name: string }

const MESSAGES = [
  "小さな変化を見逃さないで",
  "今日のたびは何kgかな？",
  "体重、チェックしてみよう",
  "変化に気づいてあげてね",
  "定期的な記録が大切だよ",
  "前回と比べてどうかな？",
  "たびの体重、把握してるね",
  "ちょっとした増減も見逃さないで",
  "体重管理も愛情のひとつだよ",
  "今日はどのくらいかな？",
  "記録することで変化がわかるよ",
  "健康の指標のひとつだよ",
  "いつも気にかけてくれてありがとう",
  "たびの体調を数字で残しておこう",
  "体重の変化は体のサインかも",
  "毎日測るの、えらいね",
  "データが積み重なると安心だよ",
  "増えすぎても減りすぎても確認が大事",
  "たびの健康を数字で守ろう",
  "ちゃんと把握してるって大事なこと",
  "今日も記録してくれてありがとう",
  "継続は力なり、記録は愛なり",
  "たびのこと、本当によく見てるんだね",
  "獣医さんにも参考になるよ",
  "数字が教えてくれることがある",
  "今日のたびは元気そう？",
  "体重の変化、見守ってあげてね",
  "毎日の積み重ねが大切だよ",
  "たびのそばにいてくれてありがとう",
  "小さな気遣いが大きな安心になるよ",
];
interface WeightLog { id: string; weight: number; measuredAt: string; user: { name: string } }

export default function WeightPage() {
  const router = useRouter();
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  const [cat, setCat] = useState<Cat | null>(null);
  const [weight, setWeight] = useState("");
  const [measuredAt, setMeasuredAt] = useState(format(new Date(), "HH:mm"));
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<WeightLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cat").then((r) => r.json()).then((cats) => {
      const c = cats[0];
      if (!c) return;
      setCat(c);
      fetch(`/api/weight?catId=${c.id}&limit=10`).then((r) => r.json()).then(setHistory);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cat) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catId: cat.id, weight: Number(weight), measuredAt: `${format(new Date(), "yyyy-MM-dd")}T${measuredAt}`, note }),
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
          <div className="text-6xl animate-bounce">⚖️</div>
          <p className="text-lg font-bold text-stone-700">記録したよ！</p>
          <p className="text-sm text-stone-400 leading-relaxed">
            たびの体重、ちゃんと把握できてるね。<br />
            変化に気づいてあげられるのは<br />
            毎日見てるからだよ 🐾
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
            <h1 className="text-base font-bold text-stone-800">たびの体重</h1>
            <p className="text-[10px] text-stone-400">{message}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card p-5">
            <label className="block text-xs font-semibold text-stone-400 mb-3 text-center">体重（kg）</label>
            <input
              type="number"
              min={0.1}
              max={20}
              step={0.01}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.00"
              className="w-full border-0 bg-stone-50 rounded-2xl px-4 py-4 text-4xl font-bold text-center text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder-stone-200"
              required
              autoFocus
            />
            <p className="text-center text-xs text-stone-300 mt-2">kg</p>
          </div>

          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">計測時刻</label>
              <input
                type="time"
                step={600}
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
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
                placeholder="食後、空腹時、病院帰り など"
                className="input"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button type="submit" disabled={saving || !weight} className="btn-primary w-full py-4 text-base">
            {saving ? "記録中..." : "記録する"}
          </button>
        </form>

        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-400 mb-2 px-1">体重きろく</p>
            <div className="card overflow-hidden divide-y divide-stone-50">
              {history.map((h, i) => {
                const prev = history[i + 1];
                const diff = prev ? h.weight - prev.weight : null;
                return (
                  <div key={h.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-lg w-7 text-center">⚖️</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-stone-700">{h.weight.toFixed(2)} kg</p>
                      <p className="text-xs text-stone-400">{h.user.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-400 tabular-nums">{format(new Date(h.measuredAt), "M/d HH:mm")}</p>
                      {diff !== null && (
                        <p className={`text-xs font-semibold mt-0.5 ${diff > 0 ? "text-red-400" : diff < 0 ? "text-[#F69F9A]" : "text-stone-300"}`}>
                          {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} kg
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
