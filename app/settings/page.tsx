"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { signOut, useSession } from "next-auth/react";

interface Cat { id: string; name: string; breed: string | null; birthday: string | null }

export default function SettingsPage() {
  const { data: session } = useSession();
  const [cat, setCat] = useState<Cat | null>(null);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [birthday, setBirthday] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cat").then((r) => r.json()).then((cats) => {
      const c: Cat = cats[0];
      if (!c) return;
      setCat(c);
      setName(c.name);
      setBreed(c.breed ?? "");
      setBirthday(c.birthday ? format(new Date(c.birthday), "yyyy-MM-dd") : "");
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cat) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/cat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cat.id,
          name,
          breed: breed || null,
          birthday: birthday || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
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

  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2]">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">⚙️</div>
          <p className="text-sm text-stone-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] pb-24">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-stone-800">設定</h1>
          <p className="text-[10px] text-stone-400">たびのプロフィールを編集</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="card p-5 space-y-4">
              <p className="text-xs font-semibold text-stone-400">たびのプロフィール</p>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1.5">名前</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="input" required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1.5">品種（任意）</label>
                <input
                  type="text" value={breed} onChange={(e) => setBreed(e.target.value)}
                  placeholder="スコティッシュフォールド など"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1.5">誕生日（任意）</label>
                <input
                  type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-400 px-1">{error}</p>}

            <button type="submit" disabled={saving || !name}
              className={`btn-primary w-full py-4 text-base transition-all ${saved ? "opacity-80" : ""}`}>
              {saved ? "保存しました ✓" : saving ? "保存中..." : "保存する"}
            </button>
          </form>

        {/* ログインユーザー */}
        <div className="card p-5 space-y-3">
          <p className="text-xs font-semibold text-stone-400">アカウント</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">{session?.user.name}</p>
              <p className="text-xs text-stone-400">{session?.user.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-stone-400 hover:text-red-400 transition-colors border border-stone-200 rounded-lg px-3 py-1.5"
            >
              ログアウト
            </button>
          </div>
        </div>
      </main>

    </div>
  );
}
