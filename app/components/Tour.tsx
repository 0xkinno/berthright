"use client";
// Guided tour: a spotlight dims everything but one element per step, with a caption and a
// timeline of chapters. Space or Right: next. Left: back. Esc: close. ?tour=1&render=1 autoplays
// (used to record the video draft).
import { useCallback, useEffect, useState } from "react";
import { Compass, X } from "lucide-react";

export interface TourStep { target: string; title: string; body: string }

export function Tour({ steps }: { steps: TourStep[] }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [render, setRender] = useState(false);

  const measure = useCallback(() => {
    const el = document.querySelector(steps[i]?.target);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    requestAnimationFrame(() => setRect(el.getBoundingClientRect()));
  }, [i, steps]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tour") === "1") { setOpen(true); setRender(q.get("render") === "1"); }
  }, []);
  useEffect(() => { if (open) measure(); }, [open, i, measure]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); setI((x) => Math.min(steps.length - 1, x + 1)); }
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    const onResize = () => measure();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, [open, steps.length, measure]);
  useEffect(() => {
    if (!open || !render) return;
    const t = setTimeout(() => setI((x) => (x + 1 < steps.length ? x + 1 : x)), 4500);
    return () => clearTimeout(t);
  }, [open, render, i, steps.length]);

  const s = steps[i];
  const pad = 10;
  return (
    <>
      <button type="button" onClick={() => { setI(0); setOpen(true); }} className="btn btn-outline"><Compass size={16} aria-hidden /> Guided tour</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Guided tour, step ${i + 1} of ${steps.length}`} className="fixed inset-0 z-[70]">
          <svg className="absolute inset-0 h-full w-full" aria-hidden onClick={() => setOpen(false)}>
            <defs>
              <mask id="spot">
                <rect width="100%" height="100%" fill="white" />
                {rect && <rect x={rect.left - pad} y={rect.top - pad} width={rect.width + pad * 2} height={rect.height + pad * 2} rx="18" fill="black" />}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(17,20,15,0.72)" mask="url(#spot)" />
            {rect && <rect x={rect.left - pad} y={rect.top - pad} width={rect.width + pad * 2} height={rect.height + pad * 2} rx="18" fill="none" stroke="#D4F25C" strokeWidth="2" />}
          </svg>
          <div className="absolute inset-x-3 bottom-3 mx-auto max-w-xl rounded-2xl bg-[color:var(--paper-hi)] p-5 shadow-2xl sm:bottom-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Step {i + 1} of {steps.length}</p>
                <p className="display mt-1 text-[24px] font-bold">{s.title}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close tour" className="inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-black/5"><X size={18} aria-hidden /></button>
            </div>
            <p className="mt-2 text-[16px] text-[color:var(--slate)]">{s.body}</p>
            <ol className="mt-4 flex gap-1" aria-label="Chapters">
              {steps.map((x, k) => (
                <li key={x.title} className="flex-1">
                  <button type="button" onClick={() => setI(k)} aria-label={`Go to step ${k + 1}: ${x.title}`} aria-current={k === i} className="flex min-h-11 w-full items-center">
                    <span className={`block h-1.5 w-full rounded-full ${k <= i ? "bg-[color:var(--ink)]" : "bg-[color:var(--hair)]"}`} />
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex justify-between">
              <button type="button" className="btn btn-outline" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
              {i + 1 < steps.length ? <button type="button" className="btn btn-lemon" onClick={() => setI(i + 1)}>Next</button> : <button type="button" className="btn btn-ink" onClick={() => setOpen(false)}>Done</button>}
            </div>
            <p className="mono mt-2 text-[11px] text-[color:var(--slate)]">Space or Right: next · Left: back · Esc: close</p>
          </div>
        </div>
      )}
    </>
  );
}
