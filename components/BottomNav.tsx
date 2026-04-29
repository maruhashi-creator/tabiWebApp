"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "ホーム", emoji: "🏠" },
  { href: "/record", label: "記録", emoji: "✏️" },
  { href: "/graph", label: "グラフ", emoji: "📈" },
  { href: "/calendar", label: "カレンダー", emoji: "📅" },
  { href: "/settings", label: "設定", emoji: "⚙️" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 safe-area-pb z-50">
      <div className="max-w-lg mx-auto flex">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 pt-3 gap-0.5 transition-colors ${
                active ? "text-[#F69F9A]" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className={`text-[10px] font-medium ${active ? "text-[#F69F9A]" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
