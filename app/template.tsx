"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    if (!isHome) return;
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.transition = "opacity 250ms ease";
      el.style.opacity = "1";
    });
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;
    const el = ref.current;
    if (!el) return;
    const handleExit = () => {
      el.style.transition = "opacity 250ms ease";
      el.style.opacity = "0";
    };
    window.addEventListener("page-exit", handleExit);
    return () => window.removeEventListener("page-exit", handleExit);
  }, [isHome]);

  if (!isHome) return <>{children}</>;

  return (
    <div ref={ref} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
