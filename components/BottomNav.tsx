"use client";

import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/", label: "ホーム", emoji: "🏠" },
  { href: "/record", label: "記録", emoji: "✏️" },
  { href: "/graph", label: "グラフ", emoji: "📈" },
  { href: "/calendar", label: "カレンダー", emoji: "📅" },
  { href: "/settings", label: "設定", emoji: "⚙️" },
];

// The single-form record screens are reached from the home shortcuts but belong to 記録.
const RECORD_PATHS = ["/record", "/feeding", "/toilet", "/weight", "/medication"];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  const handleNavigate = (href: string) => {
    if (pathname === href) return;
    // フェードアウト演出はホームにしかないので、他ページで待つと無反応時間になるだけ
    if (pathname !== "/") { router.push(href); return; }
    window.dispatchEvent(new Event("page-exit"));
    setTimeout(() => router.push(href), 250);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 safe-area-pb z-50">
      <div className="max-w-lg mx-auto flex">
        {items.map((item) => {
          const active = item.href === "/record"
            ? RECORD_PATHS.includes(pathname)
            : pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={`flex-1 flex flex-col items-center py-2 pt-3 gap-0.5 transition-colors ${
                active ? "text-primary" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className={`text-[10px] font-medium ${active ? "text-primary" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
