"use client";
// A hawser that sews itself under the words that matter.
import { motion, useReducedMotion } from "motion/react";

export function RopeUnderline({ children, delay = 0.6 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <svg aria-hidden viewBox="0 0 400 22" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-[0.14em] left-0 h-[0.32em] w-full overflow-visible">
        <defs>
          <pattern id="rope-u" width="12" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
            <rect width="12" height="10" fill="#c23d17" />
            <path d="M0 10 L6 0 M6 10 L12 0" stroke="#8e2a0c" strokeWidth="2.6" />
          </pattern>
        </defs>
        <motion.path
          d="M4 12 Q 50 3 100 11 T 200 11 T 300 11 T 396 10"
          fill="none" stroke="url(#rope-u)" strokeWidth="8" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : delay }}
        />
      </svg>
    </span>
  );
}
