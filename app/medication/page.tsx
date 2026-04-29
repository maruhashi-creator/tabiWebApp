"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { BottomNav } from "@/components/BottomNav";

interface Cat { id: string; name: string }
interface MedicationLog { id: string; name: string; dosage: string | null; givenAt: string; note: string | null; user: { name: string } }

const MESSAGES = [
  "お薬、飲んでくれたかな？",
  "投薬お疲れさま",
  "たびのために頑張ってるね",
  "薬を嫌がらずに飲んでくれたかな？",
  "記録しておくと獣医さんにも役立つよ",
  "今日も投薬できたね、えらい",
  "たびの回復を一緒に見守ろう",
  "お薬の時間、来たよ",
  "ちゃんと飲んでくれたかな？",
  "投薬記録、大切だよ",
  "毎日続けることが大事だね",
  "たびのそばにいてくれてありがとう",
  "薬で少しでも楽になってほしいね",
  "飲んでくれてよかった",
  "記録することで変化がわかるよ",
  "たびの治療、応援してるよ",
  "お薬、忘れずに記録しておこう",
  "一緒に頑張ろうね",
  "たびが元気になりますように",
  "今日も愛情込めて投薬できたね",
  "ちゃんと続けてるね、すごい",
  "たびを守ってあげてるんだね",
  "獣医さんに見せたら喜ばれるよ",
  "記録の積み重ねが信頼になる",
  "今日のお薬、完了だ",
  "たびのこと、本当によく気にかけてるね",
  "薬があるってことは、それだけ大切にしてる証拠",
  "お薬の時間も愛情のひとつだよ",
  "今日もたびのお世話、ありがとう",
  "一緒に乗り越えよう",
];

export default function MedicationPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  useEffect(() => { setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]); }, []);
  const [cat, setCat] = useState<Cat | null>(null);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [givenAt, setGivenAt] = useState(format(new Date(), "HH:mm"));
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<MedicationLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cat").then((r) => r.json()).then((cats) => {
      const c = cats[0];
      if (!c) return;
      setCat(c);
      fetch(`/api/medication?catId=${c.id}&limit=10`).then((r) => r.json()).then(setHistory).catch(() => {});
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cat) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catId: cat.id,
          name,
          dosage: dosage || undefined,
          givenAt: new Date(`${format(new Date(), "yyyy-MM-dd")}T${givenAt}:00`).toISOString(),
          note: note || undefined,
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
    return (
      <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center">
        <div className="text-center space-y-4 px-8">
          <div className="text-6xl animate-bounce">💊</div>
          <p className="text-lg font-bold text-stone-700">記録したよ！</p>
          <p className="text-sm text-stone-400 leading-relaxed">
            お薬、ちゃんと飲んでくれたんだね。<br />
            たびのために続けてくれてありがとう 🐾
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
            <h1 className="text-base font-bold text-stone-800">たびのお薬</h1>
            <p className="text-[10px] text-stone-400">{message}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">薬名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="アモキシシリン、フロセミド など"
                className="input"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">用量（任意）</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="1錠、0.5ml など"
                className="input"
              />
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">投薬時刻</label>
              <input
                type="time"
                step={600}
                value={givenAt}
                onChange={(e) => setGivenAt(e.target.value)}
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
                placeholder="嫌がった、おやつに混ぜた など"
                className="input"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button type="submit" disabled={saving || !name} className="btn-primary w-full py-4 text-base">
            {saving ? "記録中..." : "記録する"}
          </button>
        </form>

        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-400 mb-2 px-1">投薬きろく</p>
            <div className="card overflow-hidden divide-y divide-stone-50">
              {history.map((h) => (
                <div key={h.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-lg w-7 text-center">💊</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-stone-700">
                      {h.name}{h.dosage && <span className="text-xs font-normal text-stone-400 ml-1">{h.dosage}</span>}
                    </p>
                    <p className="text-xs text-stone-400">{h.user.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-400 tabular-nums">{format(new Date(h.givenAt), "M/d HH:mm")}</p>
                    {h.note && <p className="text-xs text-stone-300 mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
