"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

interface Cat { id: string; name: string }

export default function ToiletPage() {
  const router = useRouter();
  const [cat, setCat] = useState<Cat | null>(null);
  const [type, setType] = useState<"URINE" | "FECES">("URINE");
  const [count, setCount] = useState(1);
  const [condition, setCondition] = useState("");
  const [loggedAt, setLoggedAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
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
      const res = await fetch("/api/toilet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catId: cat.id, type, count, condition, loggedAt }),
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
        <h1 className="text-lg font-bold text-gray-800">🚿 トイレを記録</h1>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-xl border border-amber-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-500 mb-2">種類</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType("URINE")}
                  className={`py-4 rounded-xl border-2 text-center transition-colors ${
                    type === "URINE"
                      ? "bg-sky-50 border-sky-400 text-sky-700"
                      : "border-gray-200 text-gray-500 hover:border-sky-200"
                  }`}
                >
                  <p className="text-3xl mb-1">💧</p>
                  <p className="font-semibold">尿</p>
                </button>
                <button
                  type="button"
                  onClick={() => setType("FECES")}
                  className={`py-4 rounded-xl border-2 text-center transition-colors ${
                    type === "FECES"
                      ? "bg-amber-50 border-amber-400 text-amber-700"
                      : "border-gray-200 text-gray-500 hover:border-amber-200"
                  }`}
                >
                  <p className="text-3xl mb-1">🌼</p>
                  <p className="font-semibold">便</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">回数</label>
              <div className="flex items-center gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  className="w-12 h-12 rounded-full border-2 border-gray-300 text-xl font-bold text-gray-500 hover:border-gray-400"
                >
                  −
                </button>
                <span className="text-3xl font-bold text-gray-800 w-12 text-center">{count}</span>
                <button
                  type="button"
                  onClick={() => setCount((c) => c + 1)}
                  className="w-12 h-12 rounded-full border-2 border-gray-300 text-xl font-bold text-gray-500 hover:border-gray-400"
                >
                  ＋
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">状態メモ（任意）</label>
              <input
                type="text"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="色、量、軟便 など"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">時刻</label>
              <input
                type="datetime-local"
                value={loggedAt}
                onChange={(e) => setLoggedAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold disabled:opacity-50 transition-colors"
            >
              {saving ? "記録中..." : "記録する"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
