"use client";
import { useRef } from "react";

export function GlowCard({ children, className = "", as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "article" | "li" }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Tag
      ref={ref as never}
      onPointerMove={(e: React.PointerEvent) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - r.left}px`);
        el.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={`card glow-card p-7 ${className}`}
    >
      <div aria-hidden className="glow" />
      <div className="relative">{children}</div>
    </Tag>
  );
}
