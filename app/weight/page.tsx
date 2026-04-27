"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

interface Cat { id: string; name: string }
interface WeightLog { id: string; weight: number; measuredAt: string; user: { name: string } }

export default function WeightPage() {
  const router = useRouter();
  const [cat, setCat] = useState<Cat | null>(null);
  const [weight, setWeight] = useState("");
  const [measuredAt, setMeasuredAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<WeightLog[]>([]);
  const [saving, setSaving] = useState(false);
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
        body: JSON.stringify({ catId: cat.id, weight: Number(weight), measuredAt, note }),
      });
      if (res.ok) {
        router.push("/");
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
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white border-b border-amber-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</Link>
        <h1 className="text-lg font-bold text-gray-800">⚖️ 体重を記録</h1>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-white rounded-xl border border-amber-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">体重（kg）</label>
              <input
                type="number"
                min={0.1}
                max={20}
                step={0.01}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="例: 4.25"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">計測日時</label>
              <input
                type="datetime-local"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">メモ（任意）</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="食後、空腹時 など"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={saving || !weight}
              className="w-full py-3 rounded-lg bg-violet-500 hover:bg-violet-600 text-white font-semibold disabled:opacity-50 transition-colors"
            >
              {saving ? "記録中..." : "記録する"}
            </button>
          </form>
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
            <p className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">体重履歴</p>
            <div className="divide-y divide-gray-50">
              {history.map((h) => (
                <div key={h.id} className="px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">{h.weight.toFixed(2)} kg</span>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{format(new Date(h.measuredAt), "M/d HH:mm")}</p>
                    <p className="text-xs text-gray-300">{h.user.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
