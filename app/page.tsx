"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

interface FeedingLog { id: string; amount: number; fedAt: string; user: { name: string } }
interface ToiletLog { id: string; type: string; count: number; loggedAt: string; user: { name: string } }
interface WeightLog { id: string; weight: number; measuredAt: string }
interface Cat { id: string; name: string; breed: string | null }

export default function Dashboard() {
  const { data: session } = useSession();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayLabel = format(new Date(), "M月d日(E)", { locale: ja });

  const [cat, setCat] = useState<Cat | null>(null);
  const [feedings, setFeedings] = useState<FeedingLog[]>([]);
  const [toilets, setToilets] = useState<ToiletLog[]>([]);
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const catRes = await fetch("/api/cat").then((r) => r.json());
      const c: Cat = catRes[0];
      if (!c) { setLoading(false); return; }
      setCat(c);

      const [f, t, w] = await Promise.all([
        fetch(`/api/feeding?catId=${c.id}&date=${today}`).then((r) => r.json()),
        fetch(`/api/toilet?catId=${c.id}&date=${today}`).then((r) => r.json()),
        fetch(`/api/weight?catId=${c.id}&limit=1`).then((r) => r.json()),
      ]);
      setFeedings(f);
      setToilets(t);
      setLatestWeight(w[0] ?? null);
      setLoading(false);
    }
    load();
  }, [today]);

  const totalFed = feedings.reduce((s, f) => s + f.amount, 0);
  const urineCount = toilets.filter((t) => t.type === "URINE").reduce((s, t) => s + t.count, 0);
  const fecesCount = toilets.filter((t) => t.type === "FECES").reduce((s, t) => s + t.count, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-amber-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">🐱 たびの健康手帳</h1>
          <p className="text-xs text-gray-400">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{session?.user.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* 今日のサマリー */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            label="今日の給餌"
            value={totalFed > 0 ? `${totalFed}g` : "未記録"}
            done={totalFed > 0}
            emoji="🍚"
          />
          <SummaryCard
            label="💧 尿"
            value={urineCount > 0 ? `${urineCount}回` : "未記録"}
            done={urineCount > 0}
            emoji=""
          />
          <SummaryCard
            label="🌼 便"
            value={fecesCount > 0 ? `${fecesCount}回` : "未記録"}
            done={fecesCount > 0}
            emoji=""
          />
        </div>

        {/* 最新体重 */}
        {latestWeight && (
          <div className="bg-white rounded-xl border border-amber-100 p-4 flex items-center gap-3">
            <span className="text-2xl">⚖️</span>
            <div>
              <p className="text-xs text-gray-400">最新体重</p>
              <p className="text-xl font-bold text-gray-800">{latestWeight.weight.toFixed(2)} kg</p>
              <p className="text-xs text-gray-400">
                {format(new Date(latestWeight.measuredAt), "M/d計測")}
              </p>
            </div>
          </div>
        )}

        {/* クイック記録ボタン */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/feeding" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl p-4 text-center transition-colors">
            <p className="text-2xl mb-1">🍚</p>
            <p className="text-sm font-semibold">給餌を記録</p>
          </Link>
          <Link href="/toilet" className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl p-4 text-center transition-colors">
            <p className="text-2xl mb-1">🚿</p>
            <p className="text-sm font-semibold">トイレを記録</p>
          </Link>
          <Link href="/weight" className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl p-4 text-center transition-colors">
            <p className="text-2xl mb-1">⚖️</p>
            <p className="text-sm font-semibold">体重を記録</p>
          </Link>
        </div>

        {/* 今日の記録一覧 */}
        {feedings.length > 0 && (
          <Section title="本日の給餌記録">
            {feedings.map((f) => (
              <LogRow key={f.id}
                left={`${f.amount}g`}
                right={format(new Date(f.fedAt), "HH:mm")}
                by={f.user.name}
              />
            ))}
          </Section>
        )}

        {toilets.length > 0 && (
          <Section title="本日のトイレ記録">
            {toilets.map((t) => (
              <LogRow key={t.id}
                left={`${t.type === "URINE" ? "💧 尿" : "🌼 便"} ${t.count}回`}
                right={format(new Date(t.loggedAt), "HH:mm")}
                by={t.user.name}
              />
            ))}
          </Section>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value, done, emoji }: { label: string; value: string; done: boolean; emoji: string }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${done ? "bg-green-50 border-green-200" : "bg-white border-gray-100"}`}>
      {emoji && <p className="text-xl mb-1">{emoji}</p>}
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-sm font-bold ${done ? "text-green-600" : "text-gray-400"}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
      <p className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">{title}</p>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function LogRow({ left, right, by }: { left: string; right: string; by: string }) {
  return (
    <div className="px-4 py-2 flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{left}</span>
      <div className="text-right">
        <p className="text-sm text-gray-500">{right}</p>
        <p className="text-xs text-gray-300">{by}</p>
      </div>
    </div>
  );
}
