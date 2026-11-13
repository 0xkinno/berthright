"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";

// The night-watch deck: seven plates scattered round the headline, each a drawn moment of the product.
// Drag one and it swings back on its line; click it to open that part of the app.

const R = 14;
const Frame = ({ id, from, to, children }: { id: string; from: string; to: string; children: React.ReactNode }) => (
  <svg viewBox="0 0 300 200" className="block h-auto w-full" aria-hidden focusable="false">
    <defs>
      <clipPath id={`${id}-k`}><rect width="300" height="200" rx={R} /></clipPath>
      <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} /></linearGradient>
    </defs>
    <g clipPath={`url(#${id}-k)`}>
      <rect width="300" height="200" fill={`url(#${id}-g)`} />
      {children}
    </g>
    <rect x=".75" y=".75" width="298.5" height="198.5" rx={R - 0.5} fill="none" stroke="#ffffff" strokeOpacity=".14" strokeWidth="1.5" />
  </svg>
);

const Label = ({ x = 16, y = 186, children, fill = "#cfdbe1" }: { x?: number; y?: number; children: string; fill?: string }) => (
  <text x={x} y={y} fill={fill} fontFamily="var(--font-plex), monospace" fontSize="9.5" letterSpacing="1.4">{children}</text>
);

function BerthPlate() {
  return (
    <Frame id="hb" from="#10293a" to="#07131c">
      <path d="M0 40H300M0 80H300M0 120H300M0 160H300M60 0V200M120 0V200M180 0V200M240 0V200" stroke="#fff" strokeOpacity=".04" />
      <defs>
        <linearGradient id="hb-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7c46a" /><stop offset=".45" stopColor="#ec7f4f" /><stop offset=".46" stopColor="#1f4e63" /><stop offset="1" stopColor="#0b2533" /></linearGradient>
        <clipPath id="hb-p"><circle cx="86" cy="96" r="48" /></clipPath>
      </defs>
      <circle cx="86" cy="96" r="62" fill="#c9a865" />
      <circle cx="86" cy="96" r="56" fill="#8d6c34" />
      {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={86 + 59 * Math.cos((i * Math.PI) / 4)} cy={96 + 59 * Math.sin((i * Math.PI) / 4)} r="3" fill="#f0d9a4" />)}
      <g clipPath="url(#hb-p)">
        <rect x="30" y="40" width="112" height="112" fill="url(#hb-sea)" />
        <circle cx="86" cy="86" r="11" fill="#fff2c8" />
        <path d="M38 118h96M48 126h76M58 134h56" stroke="#f7c46a" strokeOpacity=".5" strokeWidth="1.5" />
      </g>
      <path d="M52 70 A42 42 0 0 1 116 62" stroke="#ffffff" strokeOpacity=".55" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Label x={166} y={46} fill="#c9a865">BERTH · NEP-171</Label>
      <text x="166" y="78" fill="#f4f7f8" fontFamily="var(--font-fraunces), serif" fontSize="25" letterSpacing="-.6">ab2-kestrel</text>
      <Label x={166} y={96}>crew.berthright</Label>
      <Label x={166} y={128} fill="#9fb2bc">RESERVE</Label>
      <rect x="166" y="136" width="114" height="7" rx="3.5" fill="#ffffff" fillOpacity=".1" />
      <rect x="166" y="136" width="114" height="7" rx="3.5" fill="#3fbf9b" />
      <Label x={166} y={162} fill="#3fbf9b">4 MO + FARE HOME</Label>
    </Frame>
  );
}

function ShipPlate() {
  return (
    <Frame id="hs" from="#14304a" to="#081723">
      <circle cx="236" cy="44" r="16" fill="#f3e6c4" />
      <circle cx="242" cy="40" r="14" fill="#14304a" />
      {[[40, 30], [90, 52], [150, 24], [190, 66], [270, 90], [20, 80]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.2" fill="#fff" opacity=".7" />)}
      <rect y="132" width="300" height="68" fill="#0a1f2d" />
      <path d="M40 112h170l-14 22H56z" fill="#1d3b4f" />
      <rect x="150" y="80" width="44" height="32" rx="3" fill="#26485e" />
      <rect x="168" y="58" width="5" height="22" fill="#26485e" />
      <circle cx="170.5" cy="56" r="3.5" fill="#f5b041" />
      {[70, 90, 110, 130, 158, 176].map((x, i) => <circle key={x} cx={x} cy={i > 3 ? 96 : 122} r="3.2" fill="#f5b041" />)}
      <path d="M60 142h130M80 152h90M95 162h60" stroke="#f5b041" strokeOpacity=".35" strokeWidth="2" strokeDasharray="10 6" />
      <Label>MV KESTREL · DAY 74 AT ANCHOR</Label>
    </Frame>
  );
}

function LedgerPlate() {
  const bars = [22, 30, 38, 46, 54, 62, 70, 78, 86, 94];
  return (
    <Frame id="hl" from="#f6f2e8" to="#ece5d4">
      <path d="M0 50H300M0 80H300M0 110H300M0 140H300" stroke="#0b1d29" strokeOpacity=".07" />
      <text x="18" y="38" fill="#6e531c" fontFamily="var(--font-plex), monospace" fontSize="9.5" letterSpacing="1.4">PORTAGE · WAGES SETTLED</text>
      <text x="18" y="78" fill="#0b1d29" fontFamily="var(--font-fraunces), serif" fontSize="34" letterSpacing="-1">+13.50</text>
      <text x="136" y="78" fill="#3a5060" fontFamily="var(--font-plex), monospace" fontSize="11">tUSD / day</text>
      {bars.map((h, i) => <rect key={i} x={18 + i * 27} y={170 - h} width="17" height={h} rx="2" fill={i === bars.length - 1 ? "#c53f17" : "#0b1d29"} fillOpacity={i === bars.length - 1 ? 1 : 0.16 + i * 0.05} />)}
      <path d="M18 172H282" stroke="#0b1d29" strokeOpacity=".3" />
      <text x="18" y="190" fill="#3a5060" fontFamily="var(--font-plex), monospace" fontSize="9" letterSpacing="1.2">EXACT TO THE BASE UNIT · CARRY KEPT</text>
    </Frame>
  );
}

function AllotmentPlate() {
  return (
    <Frame id="ha" from="#2a3f63" to="#e98a63">
      <rect y="140" width="300" height="60" fill="#163246" />
      <path d="M26 132h70l-8 12H34z" fill="#0b1d29" />
      <rect x="54" y="118" width="22" height="14" fill="#0b1d29" />
      <circle cx="60" cy="125" r="2" fill="#f5b041" /><circle cx="70" cy="125" r="2" fill="#f5b041" />
      <path d="M232 140v-26l18-14 18 14v26z" fill="#0b1d29" />
      <rect x="244" y="122" width="10" height="10" fill="#f5b041" />
      <path d="M206 140c2-22 4-34 10-44M216 96c-10-2-18 2-22 8M216 96c8-6 16-6 22-2M216 96c-4-8-12-12-20-12" stroke="#0b1d29" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path id="ha-arc" d="M76 116 C 120 30, 200 30, 240 100" stroke="#fff" strokeOpacity=".75" strokeWidth="2" strokeDasharray="3 7" fill="none" />
      <circle r="6" fill="#f5b041" stroke="#fff" strokeWidth="1.5" className="motion-reduce:hidden">
        <animateMotion dur="4.5s" repeatCount="indefinite" path="M76 116 C 120 30, 200 30, 240 100" />
      </circle>
      <Label fill="#e7eef2">ALLOTMENT HOME · INSIDE THE GRANT</Label>
    </Frame>
  );
}

function FlarePlate() {
  return (
    <Frame id="hf" from="#2a0f12" to="#06121a">
      <defs><radialGradient id="hf-glow"><stop offset="0" stopColor="#ff6a3d" stopOpacity=".9" /><stop offset="1" stopColor="#ff6a3d" stopOpacity="0" /></radialGradient></defs>
      <circle cx="180" cy="54" r="70" fill="url(#hf-glow)" />
      <path d="M120 170 C 140 120, 160 80, 180 54" stroke="#ffb59a" strokeOpacity=".6" strokeWidth="2.5" fill="none" strokeDasharray="2 6" />
      <circle cx="180" cy="54" r="9" fill="#fff1e6" />
      <rect y="152" width="300" height="48" fill="#0a1820" />
      <path d="M140 160h80M160 170h40" stroke="#ff6a3d" strokeOpacity=".5" strokeWidth="2" />
      <Label fill="#ffd8c9">ABANDONED · GUARANTEE RELEASED</Label>
    </Frame>
  );
}

function RecordPlate() {
  return (
    <Frame id="hr" from="#efe9db" to="#e2d9c4">
      <text x="18" y="34" fill="#6e531c" fontFamily="var(--font-plex), monospace" fontSize="9.5" letterSpacing="1.4">SEA SERVICE RECORD</text>
      {[56, 76, 96, 116, 136].map((y, i) => (
        <g key={y}><path d={`M18 ${y}H${150 + (i % 2) * 30}`} stroke="#0b1d29" strokeOpacity=".22" strokeWidth="1.5" /><path d={`M18 ${y}H${60 + i * 12}`} stroke="#0b1d29" strokeOpacity=".55" strokeWidth="1.5" /></g>
      ))}
      <g transform="rotate(-14 236 104)">
        <circle cx="236" cy="104" r="44" fill="none" stroke="#c53f17" strokeWidth="3" />
        <circle cx="236" cy="104" r="36" fill="none" stroke="#c53f17" strokeWidth="1.2" />
        <text x="236" y="100" textAnchor="middle" fill="#c53f17" fontFamily="var(--font-plex), monospace" fontSize="10" fontWeight="600" letterSpacing="1.5">SIGNED</text>
        <text x="236" y="115" textAnchor="middle" fill="#c53f17" fontFamily="var(--font-plex), monospace" fontSize="10" fontWeight="600" letterSpacing="1.5">OFF</text>
      </g>
      <text x="18" y="184" fill="#3a5060" fontFamily="var(--font-plex), monospace" fontSize="9.5" letterSpacing="1.4">KEPT BY THE BERTH, NOT THE COMPANY</text>
    </Frame>
  );
}

function ProofPlate() {
  const rows = ["sign_on refused before reserve", "wages conserved", "release pays once", "tamper detected"];
  return (
    <Frame id="hp" from="#0d2534" to="#06121a">
      <circle cx="20" cy="20" r="4" fill="#c53f17" /><circle cx="34" cy="20" r="4" fill="#f5b041" /><circle cx="48" cy="20" r="4" fill="#3fbf9b" />
      <text x="18" y="52" fill="#9fb2bc" fontFamily="var(--font-plex), monospace" fontSize="10">$ npx tsx scripts/verify.ts</text>
      {rows.map((r, i) => (
        <g key={r}>
          <path d={`M20 ${70 + i * 22}l4 4 8-9`} stroke="#3fbf9b" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="40" y={78 + i * 22} fill="#dbe6eb" fontFamily="var(--font-plex), monospace" fontSize="10">{r}</text>
        </g>
      ))}
      <Label fill="#3fbf9b">12 OF 12 FROM CHAIN EVENTS</Label>
    </Frame>
  );
}

type Plate = { key: string; href: string; label: string; art: React.ReactNode; rot: number; depth: number; xl: string; small: string; mobile: boolean };
const PLATES: Plate[] = [
  { key: "record", href: "/findings", label: "What moves when a berth changes hands", art: <RecordPlate />, rot: 8, depth: 0.5, xl: "xl:left-[14%] xl:top-[24%] xl:w-[15%]", small: "", mobile: false },
  { key: "ship", href: "/ship/0", label: "The MV Kestrel and its portage bill", art: <ShipPlate />, rot: -13, depth: 0.9, xl: "xl:left-[14%] xl:top-[55%] xl:w-[22%]", small: "w-[36%] sm:w-[30%]", mobile: true },
  { key: "berth", href: "/crew", label: "Open a crew berth", art: <BerthPlate />, rot: -2, depth: 1.3, xl: "xl:left-[50%] xl:top-[28%] xl:w-[29%]", small: "z-10 w-[52%] sm:w-[40%]", mobile: true },
  { key: "ledger", href: "/crew", label: "Wages settled into the berth every day", art: <LedgerPlate />, rot: 12, depth: 0.9, xl: "xl:left-[86%] xl:top-[54%] xl:w-[22%]", small: "w-[36%] sm:w-[30%]", mobile: true },
  { key: "proof", href: "/proof", label: "Recheck every claim from chain", art: <ProofPlate />, rot: -8, depth: 0.5, xl: "xl:left-[85%] xl:top-[23%] xl:w-[15%]", small: "", mobile: false },
  { key: "allot", href: "/judge", label: "Send an allotment home in the four-minute voyage", art: <AllotmentPlate />, rot: -20, depth: 0.7, xl: "xl:left-[24%] xl:top-[79%] xl:w-[14.5%]", small: "", mobile: false },
  { key: "flare", href: "/break", label: "Every refusal, as a real transaction", art: <FlarePlate />, rot: 17, depth: 0.7, xl: "xl:left-[76%] xl:top-[79%] xl:w-[14.5%]", small: "", mobile: false },
];

function PlateCard({ p, i, mx, my }: { p: Plate; i: number; mx: MotionValue<number>; my: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const dragged = useRef(false);
  const x = useTransform(mx, (v) => v * 26 * p.depth);
  const y = useTransform(my, (v) => v * 18 * p.depth);
  return (
    <motion.div
      className={`${p.mobile ? "" : "hidden xl:block"} ${p.small} shrink-0 xl:absolute xl:-translate-x-1/2 xl:-translate-y-1/2 ${p.xl}`}
      style={reduce ? undefined : { x, y }}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: 0, y: 60 }}
        animate={{ opacity: 1, scale: 1, rotate: p.rot, y: 0 }}
        transition={{ type: "spring", stiffness: 90, damping: 16, delay: 0.12 + i * 0.07 }}
        whileHover={reduce ? undefined : { scale: 1.05, rotate: p.rot * 0.4, zIndex: 20 }}
        drag={!reduce}
        dragSnapToOrigin
        dragElastic={0.5}
        onDragStart={() => { dragged.current = true; }}
        onDragEnd={() => { setTimeout(() => { dragged.current = false; }, 60); }}
        className="relative cursor-grab rounded-[14px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)] active:cursor-grabbing"
      >
        <Link
          href={p.href}
          draggable={false}
          onClickCapture={(e) => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); } }}
          className="block rounded-[14px] focus-visible:outline-offset-4"
        >
          <span className="sr-only">{p.label}</span>
          {p.art}
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function HeroDeck({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 18 }), sy = useSpring(my, { stiffness: 50, damping: 18 });
  return (
    <section
      aria-labelledby="hero-title"
      className="night relative overflow-hidden pb-8 pt-28 sm:pt-32 xl:h-[max(860px,min(100svh,1000px))] xl:pb-0 xl:pt-0"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
    >
      <div className="relative mx-auto flex max-w-[640px] items-center justify-center -space-x-[6%] px-2 pb-10 pt-4 xl:static xl:max-w-none xl:space-x-0 xl:p-0">
        {PLATES.map((p, i) => <PlateCard key={p.key} p={p} i={i} mx={sx} my={sy} />)}
      </div>
      <div className="relative z-10 mx-auto max-w-[680px] px-5 text-center xl:absolute xl:left-1/2 xl:top-[48%] xl:w-[40%] xl:max-w-[640px] xl:-translate-x-1/2 xl:px-0">{children}</div>
      <div className="relative z-10 mx-auto mt-10 flex max-w-[1344px] flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 xl:absolute xl:inset-x-0 xl:bottom-6 xl:mt-0 xl:justify-between xl:px-8">{footer}</div>
    </section>
  );
}
