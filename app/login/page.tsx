"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

// Return where to go after login: the callbackUrl if it is same-origin, else home.
// Reducing to a relative path (and rejecting other origins / /login) blocks open redirects.
function safeCallbackUrl(): string {
  if (typeof window === "undefined") return "/";
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!raw) return "/";
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    const dest = url.pathname + url.search + url.hash;
    return dest.startsWith("/login") ? "/" : dest;
  } catch {
    return "/";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [regMethod, setRegMethod] = useState<"phone" | "email">("phone");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError("");
  }

  function switchRegMethod(next: "phone" | "email") {
    setRegMethod(next);
    setPhone("");
    setRegEmail("");
    setError("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", { identifier, password, redirect: false });
      if (res?.ok) {
        router.push(safeCallbackUrl());
      } else {
        setError("メールアドレス・携帯番号またはパスワードが正しくありません");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const loginIdentifier = regMethod === "phone" ? phone : regEmail;
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...(regMethod === "phone" ? { phone } : { email: regEmail }),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        return;
      }
      const signInRes = await signIn("credentials", { identifier: loginIdentifier, password, redirect: false });
      if (signInRes?.ok) {
        router.push("/settings");
      } else {
        setError("登録しましたがログインに失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestLogin() {
    setError("");
    setGuestLoading(true);
    try {
      const res = await signIn("credentials", {
        identifier: "guest@tabi.app",
        password: "guest",
        redirect: false,
      });
      if (res?.ok) {
        router.push(safeCallbackUrl());
      } else {
        setError("ゲストログインに失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-stone-100 mb-5 mx-auto">
          <span className="text-5xl">🐱</span>
        </div>
        <h1 className="text-xl font-bold text-stone-800">たびの健康手帳</h1>
        <p className="text-sm text-stone-400 mt-1">毎日の小さな変化を、ふたりで記録</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-stone-100 p-6 space-y-4">
        {/* ログイン / 新規登録タブ */}
        <div className="flex rounded-2xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${mode === "login" ? "bg-white text-stone-800 shadow-sm" : "text-stone-400"}`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${mode === "register" ? "bg-white text-stone-800 shadow-sm" : "text-stone-400"}`}
          >
            新規登録
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">メールアドレス / 携帯番号</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input"
                placeholder="example@mail.com または 09012345678"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-sm mt-2">
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">お名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="おとうさん"
                required
                autoFocus
              />
            </div>

            {/* 携帯 / メール切り替え */}
            <div>
              <div className="flex rounded-xl bg-stone-100 p-0.5 mb-2">
                <button
                  type="button"
                  onClick={() => switchRegMethod("phone")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${regMethod === "phone" ? "bg-white text-stone-800 shadow-sm" : "text-stone-400"}`}
                >
                  携帯電話
                </button>
                <button
                  type="button"
                  onClick={() => switchRegMethod("email")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${regMethod === "email" ? "bg-white text-stone-800 shadow-sm" : "text-stone-400"}`}
                >
                  メールアドレス
                </button>
              </div>
              {regMethod === "phone" ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                  placeholder="09012345678"
                  required
                />
              ) : (
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="input"
                  placeholder="example@mail.com"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">パスワード（6文字以上）</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-sm mt-2">
              {loading ? "登録中..." : "アカウントを作成"}
            </button>
          </form>
        )}

        {mode === "login" && (
          <>
            <div className="relative flex items-center pt-2">
              <div className="flex-1 border-t border-stone-100" />
              <span className="px-3 text-xs text-stone-400">または</span>
              <div className="flex-1 border-t border-stone-100" />
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={guestLoading}
              className="w-full py-3.5 text-sm rounded-2xl border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
            >
              {guestLoading ? "ログイン中..." : "ゲストとして見る"}
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-stone-400 mt-8">愛するねこと一緒に、毎日を大切に 🐾</p>
    </div>
  );
}
