"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.ok) {
        router.push("/");
      } else {
        setError("メールアドレスまたはパスワードが正しくありません");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-stone-100 mb-5 mx-auto">
          <span className="text-5xl">🐱</span>
        </div>
        <h1 className="text-xl font-bold text-stone-800">たびの健康手帳</h1>
        <p className="text-sm text-stone-400 mt-1">毎日の小さな変化を、ふたりで記録</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-stone-100 p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="example@mail.com"
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-sm mt-2"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>

      <p className="text-xs text-stone-300 mt-8">たびと一緒に、毎日を大切に 🐾</p>
    </div>
  );
}
