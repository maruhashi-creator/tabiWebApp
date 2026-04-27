"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

interface Cat { id: string; name: string }

export default function FeedingPage() {
  const router = useRouter();
  const [cat, setCat] = useState<Cat | null>(null);
  const [amount, setAmount] = useState("");
  const [fedAt, setFedAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
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
      const res = await fetch("/api/feeding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catId: cat.id, amount: Number(amount), fedAt, note }),
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
        <h1 className="text-lg font-bold text-gray-800">🍚 給餌を記録</h1>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-xl border border-amber-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">給餌量（g）</label>
              <input
                type="number"
                min={1}
                max={500}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="例: 60"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[30, 40, 50, 60, 70, 80].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setAmount(String(g))}
                  className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                    amount === String(g)
                      ? "bg-orange-500 text-white border-orange-500"
                      : "border-gray-200 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  {g}g
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">時刻</label>
              <input
                type="datetime-local"
                value={fedAt}
                onChange={(e) => setFedAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">メモ（任意）</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="完食、残しあり など"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={saving || !amount}
              className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold disabled:opacity-50 transition-colors"
            >
              {saving ? "記録中..." : "記録する"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
