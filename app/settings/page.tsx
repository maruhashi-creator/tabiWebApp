"use client";

import { useEffect, useRef, useState } from "react";
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

  if (!loaded) return <div className="min-h-screen bg-[#F7F5F2]" />;

  const catLabel = cat ? `${cat.name}のプロフィール` : "ねこのプロフィールを登録";
  const subLabel = cat ? `${cat.name}のプロフィールを編集` : "ねこの名前を入力してください";

  return (
    <div className="min-h-screen bg-[#F7F5F2] pb-24">
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
                    ? <img src={photo} alt="cat" className="w-full h-full object-cover" />
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
