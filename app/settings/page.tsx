"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { signOut, useSession } from "next-auth/react";

interface Cat { id: string; name: string; breed: string | null; birthday: string | null; photo: string | null }

export default function SettingsPage() {
  const { data: session } = useSession();
  const [cat, setCat] = useState<Cat | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [birthday, setBirthday] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinResult, setJoinResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/cat").then((r) => r.json()).then((cats) => {
      const c: Cat = cats[0];
      if (c) {
        setCat(c);
        setName(c.name);
        setBreed(c.breed ?? "");
        setBirthday(c.birthday ? format(new Date(c.birthday), "yyyy-MM-dd") : "");
        setPhoto(c.photo ?? null);
      }
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const size = 400;
        const canvas = document.createElement("canvas");
        const scale = Math.min(size / img.width, size / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("5MB以下の画像を選択してください");
      return;
    }
    const compressed = await compressImage(file);
    setPhoto(compressed);
  }

  async function handleGenerateInvite() {
    setInviteLoading(true);
    try {
      const res = await fetch("/api/invite", { method: "POST" });
      const data = await res.json();
      if (res.ok) setInviteCode(data.code);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinLoading(true);
    setJoinResult(null);
    try {
      const res = await fetch("/api/invite/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setJoinResult({ ok: true, message: `${data.catName}に参加しました！` });
        setJoinCode("");
        // 猫データを再取得
        const cats = await fetch("/api/cat").then((r) => r.json());
        const c = cats[0];
        if (c) { setCat(c); setName(c.name); setBreed(c.breed ?? ""); setBirthday(c.birthday ? format(new Date(c.birthday), "yyyy-MM-dd") : ""); setPhoto(c.photo ?? null); }
      } else {
        setJoinResult({ ok: false, message: data.error ?? "参加に失敗しました" });
      }
    } catch {
      setJoinResult({ ok: false, message: "通信エラーが発生しました" });
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const isNew = !cat;
      const res = await fetch("/api/cat", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isNew
            ? { name, breed: breed || null, birthday: birthday || null, photo }
            : { id: cat!.id, name, breed: breed || null, birthday: birthday || null, photo }
        ),
      });
      if (res.ok) {
        const updated = await res.json();
        setCat(updated);
        setPhoto(updated.photo ?? null);
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

  if (!loaded) return <div className="min-h-screen bg-canvas" />;

  const catLabel = cat ? `${cat.name}のプロフィール` : "ねこのプロフィールを登録";
  const subLabel = cat ? `${cat.name}のプロフィールを編集` : "ねこの名前を入力してください";

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-stone-800">設定</h1>
          <p className="text-[10px] text-stone-400">{subLabel}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="card p-5 space-y-4">
              <p className="text-xs font-semibold text-stone-400">{catLabel}</p>

              {/* 写真 */}
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-dashed border-stone-200 bg-stone-50 flex items-center justify-center active:scale-95 transition-transform"
                >
                  {photo
                    ? <Image src={photo} alt="cat" width={96} height={96} className="w-full h-full object-cover" unoptimized />
                    : <span className="text-5xl">🐱</span>
                  }
                </button>
                <p className="text-xs text-stone-400">タップして写真を変更</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

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

        {/* 招待コードを発行 */}
        {cat && (
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold text-stone-400">家族を招待</p>
            <p className="text-xs text-stone-400">{cat.name}の世話を一緒にする人に招待コードを共有してください。コードは24時間有効です。</p>
            {inviteCode ? (
              <div className="bg-stone-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold tracking-widest text-stone-800">{inviteCode}</p>
                <p className="text-xs text-stone-400 mt-1">このコードを相手に伝えてください</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={inviteLoading}
                className="btn-primary w-full py-3 text-sm"
              >
                {inviteLoading ? "発行中..." : "招待コードを発行する"}
              </button>
            )}
            {inviteCode && (
              <button
                type="button"
                onClick={() => setInviteCode(null)}
                className="w-full text-xs text-stone-400 py-1"
              >
                閉じる
              </button>
            )}
          </div>
        )}

        {/* 招待コードで参加 */}
        <div className="card p-5 space-y-3">
          <p className="text-xs font-semibold text-stone-400">招待コードで参加</p>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="A3B9F2"
              maxLength={6}
              className="input flex-1 text-center tracking-widest font-bold uppercase"
            />
            <button
              type="submit"
              disabled={joinLoading || joinCode.length !== 6}
              className="btn-primary px-4 py-2 text-sm shrink-0"
            >
              {joinLoading ? "..." : "参加"}
            </button>
          </form>
          {joinResult && (
            <p className={`text-xs px-1 ${joinResult.ok ? "text-emerald-500" : "text-red-400"}`}>
              {joinResult.message}
            </p>
          )}
        </div>

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
