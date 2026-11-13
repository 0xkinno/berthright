"use client";
// The Berthright harbour, drawn in code: a patchwork sea of sewn felt, a bulk carrier at anchor
// with twelve portholes that light one by one, a seafarer on the quay beside the wage chest, a
// hawser that draws itself from the chest to the ship, and an allotment boat sailing a stitched
// route home to a Kerala village. Soft clay shading comes from gradients and a felt grain filter.
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const PORTS = Array.from({ length: 12 }, (_, i) => ({ cx: 1032 + (i % 4) * 30, cy: 318 + Math.floor(i / 4) * 34 }));
const ROUTE = "M960 520 C 820 470, 700 430, 560 360 S 340 250, 250 236";

export function HarborArt({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const [lit, setLit] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (reduce) { setLit(12); return; }
    let i = 0;
    const t = setInterval(() => { i += 1; setLit(i); if (i >= 12) clearInterval(t); }, 160);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <svg viewBox="0 40 1600 760" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="A clay harbour at dawn: a seafarer stands by the wage chest on the quay, a rope runs to a ship at anchor whose portholes light up, and a small boat carries the allotment home to a village on the far shore">
      <defs>
        <linearGradient id="h-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe0ee" />
          <stop offset="0.62" stopColor="#f6e5c8" />
          <stop offset="1" stopColor="#f9dcb6" />
        </linearGradient>
        <radialGradient id="h-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe7a3" />
          <stop offset="0.6" stopColor="#ffd77a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffd77a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="h-hill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a9d49b" /><stop offset="1" stopColor="#7fb874" /></linearGradient>
        <linearGradient id="h-hill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c3e2b2" /><stop offset="1" stopColor="#97c98a" /></linearGradient>
        <linearGradient id="h-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b4d69" /><stop offset="1" stopColor="#14293a" /></linearGradient>
        <linearGradient id="h-house" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffaf0" /><stop offset="1" stopColor="#ece2cf" /></linearGradient>
        <linearGradient id="h-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9ad79" /><stop offset="1" stopColor="#b98653" /></linearGradient>
        <linearGradient id="h-chest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b5764a" /><stop offset="1" stopColor="#8a5531" /></linearGradient>
        <pattern id="h-rope" width="14" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width="14" height="10" fill="#d9b679" />
          <path d="M0 10 L7 0 M7 10 L14 0" stroke="#a9834a" strokeWidth="3" />
        </pattern>
        <filter id="h-clay" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#0f2a3a" floodOpacity="0.18" />
        </filter>
        <filter id="h-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18" /></filter>
        <filter id="h-felt" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0" result="g" />
          <feComposite in="g" in2="SourceGraphic" operator="in" result="gg" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="gg" /></feMerge>
        </filter>
        <filter id="h-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* sky and sun */}
      <rect y="0" width="1600" height="840" fill="url(#h-sky)" />
      <circle cx="1270" cy="170" r="150" fill="url(#h-sun)" />
      <circle cx="1270" cy="170" r="58" fill="#ffe3a0" />
      <g className="drift" opacity="0.9">
        <path d="M180 120 q30 -26 62 -4 q22 -18 46 0 q30 2 26 22 h-150 q-8 -16 16 -18z" fill="#fffaf2" filter="url(#h-clay)" />
        <path d="M640 80 q24 -20 50 -3 q18 -14 37 0 q24 2 21 18 h-120 q-6 -13 12 -15z" fill="#fffaf2" filter="url(#h-clay)" />
      </g>
      <g className="gull" stroke="#3d5463" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M760 190 q12 -10 24 0 q12 -10 24 0" />
        <path d="M830 160 q9 -8 18 0 q9 -8 18 0" />
      </g>

      {/* far shore: Kerala village with palms */}
      <g filter="url(#h-felt)">
        <path d="M0 300 Q 160 210 330 252 T 640 262 Q 760 250 820 292 L 820 360 L 0 360 Z" fill="url(#h-hill2)" />
        <path d="M0 330 Q 120 280 260 300 T 520 318 Q 620 306 700 336 L 700 380 L 0 380 Z" fill="url(#h-hill1)" />
      </g>
      {[[110, 258, "#f39a78"], [185, 248, "#5fbdb8"], [262, 252, "#f2c14e"], [340, 268, "#79bfe6"]].map(([x, y, roof], i) => (
        <g key={i} filter="url(#h-clay)">
          <rect x={Number(x)} y={Number(y)} width="54" height="40" rx="6" fill="url(#h-house)" />
          <path d={`M${Number(x) - 6} ${Number(y) + 2} L${Number(x) + 27} ${Number(y) - 24} L${Number(x) + 60} ${Number(y) + 2} Z`} fill={String(roof)} />
          <rect x={Number(x) + 9} y={Number(y) + 14} width="11" height="11" rx="2" fill="#f2c14e" opacity="0.85" />
          <rect x={Number(x) + 32} y={Number(y) + 18} width="12" height="22" rx="3" fill="#7d5a3a" />
        </g>
      ))}
      {[[70, 300], [420, 292], [500, 300]].map(([x, y], i) => (
        <g key={i} filter="url(#h-clay)">
          <path d={`M${x} ${y} q 6 -40 -4 -78`} stroke="#8a6440" strokeWidth="7" fill="none" strokeLinecap="round" />
          {[-60, -20, 20, 60, 100].map((a) => (
            <ellipse key={a} cx={x - 4} cy={y - 80} rx="30" ry="9" fill="#5fae6a" transform={`rotate(${a} ${x - 4} ${y - 80}) translate(22 0)`} />
          ))}
        </g>
      ))}

      {/* patchwork sea: felt patches sewn together */}
      <g filter="url(#h-felt)">
        <path d="M0 360 L 820 330 L 1600 350 L 1600 840 L 0 840 Z" fill="#7cc6c6" />
        <path d="M0 360 L 420 352 L 380 470 L 0 500 Z" fill="#8fd0cb" />
        <path d="M420 352 L 900 334 L 960 440 L 380 470 Z" fill="#79bfe6" />
        <path d="M900 334 L 1600 350 L 1600 470 L 960 440 Z" fill="#6cc0c4" />
        <path d="M0 500 L 380 470 L 460 620 L 0 660 Z" fill="#5fb8b6" />
        <path d="M380 470 L 960 440 L 1040 600 L 460 620 Z" fill="#86c9dd" />
        <path d="M960 440 L 1600 470 L 1600 640 L 1040 600 Z" fill="#7fc9b6" />
        <path d="M0 660 L 460 620 L 530 840 L 0 840 Z" fill="#6fbfc9" />
        <path d="M460 620 L 1040 600 L 1120 840 L 530 840 Z" fill="#5eb2b9" />
        <path d="M1040 600 L 1600 640 L 1600 840 L 1120 840 Z" fill="#79c3d6" />
      </g>
      <g stroke="#fffbf3" strokeWidth="3" strokeDasharray="10 9" fill="none" opacity="0.75" strokeLinecap="round">
        <path d="M420 352 L 380 470 L 460 620 L 520 760" />
        <path d="M900 334 L 960 440 L 1040 600 L 1100 760" />
        <path d="M0 500 L 380 470 L 960 440 L 1600 470" />
        <path d="M0 660 L 460 620 L 1040 600 L 1600 640" />
      </g>
      {[[200, 420], [700, 520], [1300, 540], [560, 690], [1240, 690]].map(([x, y], i) => (
        <path key={i} className="drift" d={`M${x} ${y} q 14 -10 28 0 q 14 10 28 0`} stroke="#ffffff" strokeOpacity="0.7" strokeWidth="4" fill="none" strokeLinecap="round" />
      ))}

      {/* the allotment's stitched route home, with its little boat */}
      <path d={ROUTE} stroke="#c23d17" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" fill="none" opacity="0.8" />
      {mounted && !reduce && (
        <motion.g
          style={{ offsetPath: `path("${ROUTE}")`, offsetRotate: "0deg" } as never}
          initial={{ offsetDistance: "0%" } as never}
          animate={{ offsetDistance: ["0%", "100%"] } as never}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
        >
          <g transform="translate(-22 -26)" filter="url(#h-clay)">
            <path d="M0 22 L44 22 L36 34 L8 34 Z" fill="#f39a78" />
            <path d="M22 0 L22 22 L38 22 Z" fill="#fffaf0" />
            <rect x="10" y="14" width="10" height="8" rx="1.5" fill="#f2c14e" />
          </g>
        </motion.g>
      )}

      {/* the ship at anchor */}
      <g className="bob" filter="url(#h-clay)">
        <path d="M820 470 L 1420 456 Q 1470 456 1478 470 L 1452 548 Q 1446 560 1430 560 L 870 566 Q 852 566 846 552 Z" fill="url(#h-hull)" />
        <path d="M846 540 L 1458 532 L 1452 548 Q 1446 560 1430 560 L 870 566 Q 852 566 846 552 Z" fill="#c23d17" />
        <path d="M824 474 L 1422 460" stroke="#f2c14e" strokeWidth="3" opacity="0.6" />
        {[880, 950, 1020, 1090].map((x) => <rect key={x} x={x - 940 + 900 - 20} y={448 - (x - 880) * 0.02} width="56" height="20" rx="5" fill="#3e6b6b" />)}
        <g stroke="#9aa3a0" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M930 452 L 930 380 L 980 410" />
          <path d="M1020 450 L 1020 386 L 970 414" />
        </g>
        <rect x="1012" y="296" width="152" height="164" rx="14" fill="#fbf4e6" />
        <rect x="1004" y="288" width="168" height="16" rx="7" fill="#e7dcc7" />
        <rect x="1060" y="244" width="64" height="48" rx="10" fill="#fbf4e6" />
        <rect x="1096" y="206" width="28" height="42" rx="6" fill="#0f2a3a" />
        <rect x="1096" y="216" width="28" height="9" fill="#c23d17" />
        {PORTS.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r="9.5" className={`porthole ${i < lit ? "on" : ""}`} stroke="#b99a5f" strokeWidth="3" style={i < lit ? { filter: "drop-shadow(0 0 7px rgba(242,193,78,0.95))" } : undefined} />
        ))}
        <circle cx="1400" cy="478" r="7" fill="#b99a5f" />
      </g>

      {/* quay, seafarer, wage chest and the hawser */}
      <g filter="url(#h-felt)">
        <path d="M0 560 L 420 548 L 450 600 L 0 620 Z" fill="url(#h-wood)" />
        <path d="M0 620 L 450 600 L 450 640 L 0 662 Z" fill="#9c6b3f" />
      </g>
      <g stroke="#a47848" strokeWidth="2" opacity="0.7">
        {[60, 140, 220, 300, 380].map((x) => <path key={x} d={`M${x} ${560 - x * 0.03} L ${x + 18} ${615 - x * 0.04}`} />)}
      </g>
      <g filter="url(#h-clay)">
        <rect x="250" y="490" width="110" height="74" rx="12" fill="url(#h-chest)" />
        <path d="M250 512 h110" stroke="#f2c14e" strokeWidth="6" />
        <rect x="294" y="504" width="22" height="26" rx="5" fill="#f2c14e" />
        <circle cx="305" cy="518" r="4" fill="#6f5527" />
        <rect x="372" y="540" width="20" height="26" rx="6" fill="#55636b" />
        <ellipse cx="382" cy="540" rx="16" ry="6" fill="#6b7b84" />
      </g>
      <motion.path
        d="M382 540 C 560 600, 700 600, 840 512 S 1180 500, 1400 478"
        fill="none" stroke="url(#h-rope)" strokeWidth="11" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 2.4, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
      />
      <g filter="url(#h-clay)">
        <ellipse cx="170" cy="566" rx="34" ry="8" fill="#0f2a3a" opacity="0.18" />
        <rect x="140" y="470" width="60" height="96" rx="28" fill="#1f4a6b" />
        <rect x="140" y="510" width="60" height="9" fill="#f2c14e" />
        <circle cx="170" cy="446" r="27" fill="#b98457" />
        <path d="M140 440 Q 170 404 200 440 Z" fill="#c23d17" />
        <rect x="136" y="436" width="68" height="8" rx="4" fill="#a93210" />
        <circle cx="162" cy="450" r="3" fill="#2a1d14" />
        <circle cx="180" cy="450" r="3" fill="#2a1d14" />
        <path d="M163 460 q7 5 14 0" stroke="#2a1d14" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M196 500 q 30 6 52 22" stroke="#1f4a6b" strokeWidth="16" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
