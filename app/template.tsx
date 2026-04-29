"use client";

import { useEffect, useRef } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  // Fade in on mount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.transition = "opacity 250ms ease";
      el.style.opacity = "1";
    });
  }, []);

  // Fade out when BottomNav signals navigation
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleExit = () => {
      el.style.transition = "opacity 250ms ease";
      el.style.opacity = "0";
    };
    window.addEventListener("page-exit", handleExit);
    return () => window.removeEventListener("page-exit", handleExit);
  }, []);

  return (
    <div ref={ref} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
