"use client";
// A bulk carrier at anchor at dusk, drawn in code. Twelve portholes in three decks light up one by
// one as the counter reaches four months on board ("lights on board"). Reduced motion: all lit.
import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

const PORTS = Array.from({ length: 12 }, (_, i) => ({ id: `port-${i + 1}`, cx: 358 + (i % 4) * 22, cy: 156 + Math.floor(i / 4) * 24 }));

export function ShipArt({ months = 4 }: { months?: number }) {
  const reduce = useReducedMotion();
  const [lit, setLit] = useState(reduce ? 12 : 0);
  const { scrollY } = useScroll();
  const far = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 12]);
  const mid = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 6]);

  useEffect(() => {
    if (reduce) { setLit(12); return; }
    let i = 0;
    const t = setInterval(() => { i += 1; setLit(i); if (i >= 12) clearInterval(t); }, 170);
    return () => clearInterval(t);
  }, [reduce]);

  const shown = Math.min(months, Math.round((lit / 12) * months * 10) / 10);

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[color:var(--ink)] shadow-[inset_0_0_80px_rgba(212,242,92,0.08),0_30px_60px_-30px_rgba(17,20,15,0.6)]">
      <svg viewBox="0 0 560 420" className="block h-auto w-full" role="img" aria-label="A bulk carrier at anchor at dusk; its portholes light up one by one">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b2230" />
            <stop offset="0.55" stopColor="#2c3340" />
            <stop offset="1" stopColor="#5b5a52" />
          </linearGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d2a33" />
            <stop offset="1" stopColor="#0d1418" />
          </linearGradient>
          <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c211a" />
            <stop offset="1" stopColor="#0b0d0a" />
          </linearGradient>
          <filter id="haze"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <rect width="560" height="420" fill="url(#sky)" />
        <motion.g style={{ y: far }}>
          <path d="M0 236 L70 222 L140 230 L210 214 L300 228 L380 218 L460 226 L560 216 L560 250 L0 250 Z" fill="#3f4038" opacity="0.7" />
          <ellipse cx="420" cy="232" rx="180" ry="10" fill="#c9b78f" opacity="0.18" filter="url(#haze)" />
        </motion.g>
        <line x1="0" y1="250" x2="560" y2="250" stroke="#A88A54" strokeWidth="1" opacity="0.8" />
        <rect y="250" width="560" height="170" fill="url(#sea)" />
        {[268, 290, 318, 352, 392].map((y, i) => (
          <line key={y} x1={20 + i * 6} y1={y} x2={540 - i * 10} y2={y} stroke="#2f4250" strokeWidth={1 + i * 0.3} opacity={0.6 - i * 0.08} />
        ))}
        <path d="M200 120 q8 -6 16 0 M216 120 q8 -6 16 0" stroke="#9aa39a" strokeWidth="1.2" fill="none" opacity="0.7" />
        <path d="M262 96 q6 -5 12 0 M274 96 q6 -5 12 0" stroke="#9aa39a" strokeWidth="1.1" fill="none" opacity="0.6" />
        <motion.g style={{ y: mid }}>
          {/* hull, three-quarter view */}
          <path d="M40 230 L470 214 L512 236 L496 286 L70 300 Z" fill="url(#hull)" stroke="#2c3428" strokeWidth="1" />
          <path d="M70 300 L496 286" stroke="#D4F25C" strokeWidth="1.6" opacity="0.85" filter="url(#glow)" />
          <path d="M40 230 L470 214" stroke="#A88A54" strokeWidth="1" opacity="0.6" />
          {/* hatch covers */}
          {[78, 132, 186, 240, 294].map((x) => (
            <path key={x} d={`M${x} ${226 - (x - 40) * 0.037} l42 -1.6 l0 -10 l-42 1.6 z`} fill="#2a3326" stroke="#3d4a36" strokeWidth="0.8" />
          ))}
          {/* cranes */}
          {[120, 228].map((x) => (
            <g key={x} stroke="#6b6a5c" strokeWidth="2" fill="none"><line x1={x} y1={224 - (x - 40) * 0.037} x2={x} y2={170} /><line x1={x} y1={172} x2={x + 46} y2={196} /></g>
          ))}
          {/* accommodation block at the stern */}
          <path d="M346 214 L346 132 L446 128 L446 210 Z" fill="#20261d" stroke="#3a4634" strokeWidth="1" />
          <path d="M340 132 L452 127 L452 121 L340 126 Z" fill="#2c3428" />
          <path d="M372 126 L372 108 L420 106 L420 124 Z" fill="#20261d" stroke="#3a4634" />
          <rect x="390" y="92" width="8" height="15" fill="#3a4634" />
          {PORTS.map((p, i) => (
            <circle key={p.id} id={p.id} cx={p.cx} cy={p.cy - i * 0.12} r="5.2" className={`porthole ${i < lit ? "on" : ""}`} style={i < lit ? { filter: "drop-shadow(0 0 6px rgba(212,242,92,0.9))" } : undefined} stroke="#A88A54" strokeWidth="1.2" />
          ))}
          {/* anchor chain */}
          <path d="M78 262 Q70 300 52 340 Q44 360 40 390" stroke="#7d7b6c" strokeWidth="2.2" fill="none" strokeDasharray="4 3" />
          <path d="M60 300 L76 268" stroke="#4b4a40" strokeWidth="5" />
        </motion.g>
        <rect width="560" height="420" fill="none" stroke="#A88A54" strokeOpacity="0.25" />
      </svg>
      <div className="flex items-end justify-between gap-4 border-t border-[color:var(--brass-soft)]/30 px-5 py-4 sm:px-6">
        <div>
          <p className="eyebrow !text-[color:var(--brass-soft)]">Nº 04 · On board</p>
          <p className="mono mt-1 text-[34px] font-medium leading-none text-[color:var(--lemon)] sm:text-[44px]" aria-live="polite">{shown.toFixed(1)} months</p>
        </div>
        <p className="mono max-w-[13rem] text-right text-[12px] leading-snug text-[#c9c6b6]">MV Kestrel (fictional) · fast-clock demo ship · testnet</p>
      </div>
    </div>
  );
}
