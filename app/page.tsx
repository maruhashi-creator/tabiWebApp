"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { BottomNav } from "@/components/BottomNav";
import Link from "next/link";

interface FeedingLog { id: string; amount: number; foodType: string | null; fedAt: string; user: { name: string } }
interface ToiletLog { id: string; type: string; count: number; loggedAt: string; user: { name: string } }
interface WeightLog { id: string; weight: number; measuredAt: string }
interface Cat { id: string; name: string; breed: string | null; birthday: string | null }
interface Anomaly { type: string; level: "warn" | "alert"; message: string }

function catAge(birthday: string | null) {
  if (!birthday) return null;
  const bd = new Date(birthday);
  const years = differenceInYears(new Date(), bd);
  const months = differenceInMonths(new Date(), bd) % 12;
  return years > 0 ? `${years}歳${months}ヶ月` : `${months}ヶ月`;
}

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "おはよう、たび！今日もよろしくね 🌅";
  if (h >= 11 && h < 17) return "たびは元気かな？";
  if (h >= 17 && h < 21) return "今日もよく頑張ったね 🌙";
  return "もうおやすみの時間だよ 😴";
}

function foodEmoji(foodType: string | null) {
  if (foodType === "ミルク") return "🥛";
  if (foodType === "おやつ") return "🍬";
  if (foodType === "ウェット") return "🍖";
  return "🥣";
}

export default function Dashboard() {
  const { data: session } = useSession();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayLabel = format(new Date(), "M月d日(E)", { locale: ja });

  const [cat, setCat] = useState<Cat | null>(null);
  const [feedings, setFeedings] = useState<FeedingLog[]>([]);
  const [toilets, setToilets] = useState<ToiletLog[]>([]);
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const cats = await fetch("/api/cat").then((r) => r.json());
    const c: Cat = cats[0];
    if (!c) { setLoading(false); return; }
    setCat(c);
    const [f, t, w, a] = await Promise.all([
      fetch(`/api/feeding?catId=${c.id}&date=${today}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/toilet?catId=${c.id}&date=${today}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/weight?catId=${c.id}&limit=1`).then((r) => r.json()).catch(() => []),
      fetch(`/api/anomaly?catId=${c.id}`).then((r) => r.json()).catch(() => []),
    ]);
    setFeedings(Array.isArray(f) ? f : []);
    setToilets(Array.isArray(t) ? t : []);
    setLatestWeight(Array.isArray(w) ? (w[0] ?? null) : null);
    setAnomalies(Array.isArray(a) ? a : []);
    setLoading(false);
    setRefreshing(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) setPullY(Math.min(dy, 80));
    };
    const onTouchEnd = () => {
      if (pullY >= 70) {
        setRefreshing(true);
        load(true);
      }
      setPullY(0);
    };
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullY, load]);

  const totalFed = feedings.reduce((s, f) => s + f.amount, 0);
  const urineCount = toilets.filter((t) => t.type === "URINE").reduce((s, t) => s + t.count, 0);
  const fecesCount = toilets.filter((t) => t.type === "FECES").reduce((s, t) => s + t.count, 0);
  const fedDone = totalFed > 0;
  const urineDone = urineCount > 0;
  const fecesDone = fecesCount > 0;
  const allDone = fedDone && urineDone && fecesDone;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2]">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">🐱</div>
          <p className="text-sm text-stone-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] pb-24">
      {(pullY > 0 || refreshing) && (
        <div className="fixed top-0 left-0 right-0 flex justify-center z-50 pointer-events-none"
          style={{ paddingTop: refreshing ? 12 : Math.max(0, pullY - 20) }}>
          <span className={`text-2xl ${refreshing ? "animate-spin" : ""}`}>🐾</span>
        </div>
      )}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-stone-800 leading-tight">たびの健康手帳</h1>
            <p className="text-[10px] text-stone-400">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-500">{session?.user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-stone-300 hover:text-stone-500 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {/* 猫プロフィールカード */}
        {cat && (
          <div className="card p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-stone-100 flex-shrink-0">
                <Image src="/tabi-card.png" alt="たび" width={64} height={64} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-lg font-bold text-stone-800">{cat.name}</h2>
                  {catAge(cat.birthday) && (
                    <span className="text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-100">
                      {catAge(cat.birthday)}
                    </span>
                  )}
                </div>
                {cat.breed && <p className="text-xs text-stone-400">{cat.breed}</p>}
                <p className="text-xs text-stone-500 mt-1">{greeting()}</p>
              </div>
              {latestWeight && (
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-stone-400">体重</p>
                  <p className="text-base font-bold text-stone-700">{latestWeight.weight.toFixed(2)}<span className="text-xs font-normal text-stone-400 ml-0.5">kg</span></p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 異常検知アラート */}
        {anomalies.map((a, i) => (
          <div
            key={i}
            className={`card p-4 flex items-center gap-3 border ${
              a.level === "alert" ? "border-red-200 bg-red-50" : "border-amber-100 bg-amber-50"
            }`}
          >
            <span className="text-2xl">{a.level === "alert" ? "⚠️" : "🔔"}</span>
            <p className={`text-sm font-medium ${a.level === "alert" ? "text-red-600" : "text-amber-700"}`}>
              {a.message}
            </p>
          </div>
        ))}

        {/* 全完了 */}
        {allDone && anomalies.length === 0 && (
          <div className="card p-4 flex items-center gap-3">
            <span className="text-2xl">🌟</span>
            <div>
              <p className="text-sm font-bold text-stone-700">今日も完璧！</p>
              <p className="text-xs text-stone-400">たびのケアをありがとう 🐾</p>
            </div>
          </div>
        )}

        {/* 今日のステータス */}
        <div>
          <p className="text-xs font-semibold text-stone-400 mb-2 px-1">今日のようす</p>
          <div className="grid grid-cols-3 gap-2">
            <StatusCard emoji="🥣" label="ごはん" value={fedDone ? `${totalFed}g` : "まだかな"} done={fedDone} />
            <StatusCard emoji="💧" label="トイレ" value={urineDone ? `${urineCount}回` : "まだかな"} done={urineDone} />
            <StatusCard emoji="🌼" label="トイレ" value={fecesDone ? `${fecesCount}回` : "まだかな"} done={fecesDone} />
          </div>
        </div>

        {/* クイック記録 */}
        <div>
          <p className="text-xs font-semibold text-stone-400 mb-2 px-1">記録する</p>
          <div className="grid grid-cols-4 gap-2">
            <QuickButton href="/feeding" emoji="🍚" label="ごはん" done={fedDone} />
            <QuickButton href="/toilet" emoji="🚿" label="トイレ" done={urineDone && fecesDone} />
            <QuickButton href="/weight" emoji="⚖️" label="体重" done={false} />
            <QuickButton href="/medication" emoji="💊" label="お薬" done={false} />
          </div>
        </div>

        {/* タイムライン */}
        {(feedings.length > 0 || toilets.length > 0) && (
          <div>
            <p className="text-xs font-semibold text-stone-400 mb-2 px-1">今日のたび</p>
            <div className="card overflow-hidden divide-y divide-stone-50">
              {[...feedings.map((f) => ({
                id: f.id,
                source: "feeding" as const,
                time: f.fedAt,
                emoji: foodEmoji(f.foodType),
                label: `${f.foodType ?? "ごはん"} ${f.amount}g`,
                by: f.user.name,
              })), ...toilets.map((t) => ({
                id: t.id,
                source: "toilet" as const,
                time: t.loggedAt,
                emoji: t.type === "URINE" ? "💧" : "🌼",
                label: `${t.count}回`,
                by: t.user.name,
              }))]
                .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                .map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-lg w-7 text-center">{item.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-700">{item.label}</p>
                      <p className="text-xs text-stone-400">{item.by}</p>
                    </div>
                    <p className="text-xs text-stone-400 tabular-nums">
                      {format(new Date(item.time), "HH:mm")}
                    </p>
                    <button
                      onClick={async () => {
                        if (!confirm("この記録を削除しますか？")) return;
                        await fetch(`/api/${item.source}?id=${item.id}`, { method: "DELETE" });
                        if (item.source === "feeding") setFeedings((prev) => prev.filter((f) => f.id !== item.id));
                        else setToilets((prev) => prev.filter((t) => t.id !== item.id));
                      }}
                      className="text-stone-200 hover:text-red-400 transition-colors text-lg pl-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {feedings.length === 0 && toilets.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">🐾</p>
            <p className="text-sm text-stone-500">今日の記録がまだないよ</p>
            <p className="text-xs text-stone-300 mt-1">ごはんやトイレを記録してみてね</p>
          </div>
        )}

        <p className="text-center text-[10px] text-stone-400 pb-2">{process.env.NEXT_PUBLIC_COMMIT_SHA}</p>
      </main>

      <BottomNav />
    </div>
  );
}

function StatusCard({ emoji, label, value, done }: { emoji: string; label: string; value: string; done: boolean }) {
  return (
    <div className="card p-3.5 text-center">
      <p className="text-2xl mb-1.5">{emoji}</p>
      {label && <p className="text-[10px] text-stone-400 mb-1">{label}</p>}
      <p className={`text-xs font-bold ${done ? "text-stone-700" : "text-stone-300"}`}>{value}</p>
      {done && <div className="w-1.5 h-1.5 bg-[#F69F9A] rounded-full mx-auto mt-1.5" />}
    </div>
  );
}

function QuickButton({ href, emoji, label, done }: { href: string; emoji: string; label: string; done: boolean }) {
  return (
    <Link
      href={href}
      className="relative card p-4 text-center active:scale-95 transform transition-transform block"
    >
      {done && (
        <span className="absolute top-2 right-2 text-[#F69F9A] text-xs">✓</span>
      )}
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-xs font-semibold text-stone-600">{label}</p>
    </Link>
  );
}
