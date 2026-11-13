// Step scenes for "How it works": small clay models laid on a plotting sheet, one idea each.
const Defs = ({ id }: { id: string }) => (
  <defs>
    <filter id={`${id}-c`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#0f2a3a" floodOpacity="0.2" /></filter>
    <filter id={`${id}-f`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" /><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0" result="g" /><feComposite in="g" in2="SourceGraphic" operator="in" result="gg" /><feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="gg" /></feMerge></filter>
    <linearGradient id={`${id}-chest`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b5764a" /><stop offset="1" stopColor="#8a5531" /></linearGradient>
    <linearGradient id={`${id}-coin`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd970" /><stop offset="1" stopColor="#e3a92c" /></linearGradient>
  </defs>
);

function Ground({ id, fill }: { id: string; fill: string }) {
  const t = "#a9874a";
  return (
    <g>
      <rect x="20" y="20" width="520" height="380" rx="10" fill={fill} filter={`url(#${id}-f)`} />
      <path d="M20 84H540M20 148H540M20 212H540M20 276H540M20 340H540M84 20V400M148 20V400M212 20V400M276 20V400M340 20V400M404 20V400M468 20V400" stroke="#0b1d29" strokeOpacity="0.06" />
      <path d={`M34 52V34H52M508 34H526V52M526 368V386H508M52 386H34V368`} fill="none" stroke={t} strokeWidth="2.5" />
    </g>
  );
}

function Coins({ x, y, n, id }: { x: number; y: number; n: number; id: string }) {
  return (
    <g filter={`url(#${id}-c)`}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <ellipse cx={x} cy={y - i * 13 + 6} rx="30" ry="9" fill="#c98f1f" />
          <ellipse cx={x} cy={y - i * 13} rx="30" ry="9" fill={`url(#${id}-coin)`} />
        </g>
      ))}
    </g>
  );
}

export function ReserveScene() {
  const id = "s1";
  return (
    <svg viewBox="0 0 560 420" className="h-auto w-full" role="img" aria-label="Four stacks of coins, one per month, locked inside a wage chest before anyone signs on">
      <Defs id={id} />
      <Ground id={id} fill="#fbfdfc" />
      <g filter={`url(#${id}-c)`}>
        <rect x="96" y="210" width="300" height="130" rx="22" fill={`url(#${id}-chest)`} />
        <path d="M96 252 h300" stroke="#f2c14e" strokeWidth="9" />
        <rect x="226" y="236" width="40" height="46" rx="9" fill="#f2c14e" />
        <circle cx="246" cy="258" r="6" fill="#6f5527" />
      </g>
      {[150, 210, 282, 342].map((x, i) => <Coins key={x} x={x} y={196} n={4} id={id} />)}
      {["M1", "M2", "M3", "M4"].map((m, i) => <text key={m} x={150 + [0, 60, 132, 192][i]} y="114" textAnchor="middle" fontFamily="var(--font-plex), monospace" fontSize="17" fill="#6f5527">{m}</text>)}
      <g filter={`url(#${id}-c)`}>
        <rect x="414" y="216" width="92" height="56" rx="12" fill="#fffbf3" />
        <text x="460" y="250" textAnchor="middle" fontFamily="var(--font-plex), monospace" fontSize="15" fill="#0f2a3a">+ fare</text>
      </g>
      <g filter={`url(#${id}-c)`}>
        <rect x="414" y="296" width="92" height="40" rx="10" fill="#c23d17" />
        <text x="460" y="322" textAnchor="middle" fontFamily="var(--font-plex), monospace" fontSize="14" fill="#fffbf3">LOCKED</text>
      </g>
    </svg>
  );
}

export function WagesScene() {
  const id = "s2";
  return (
    <svg viewBox="0 0 560 420" className="h-auto w-full" role="img" aria-label="A tide gauge filling as daily wages flow into the berth account">
      <Defs id={id} />
      <Ground id={id} fill="#fbfdfc" />
      <g filter={`url(#${id}-c)`}>
        <rect x="88" y="70" width="84" height="280" rx="18" fill="#fffbf3" />
        <rect x="98" y="200" width="64" height="140" rx="12" fill="#5fbdb8" />
        <path d="M98 214 q 16 -10 32 0 t 32 0" stroke="#fffbf3" strokeWidth="4" fill="none" />
        {[100, 140, 180, 220, 260, 300].map((y) => <path key={y} d={`M172 ${y} h18`} stroke="#6f5527" strokeWidth="3" />)}
      </g>
      <g filter={`url(#${id}-c)`}>
        <rect x="300" y="236" width="196" height="110" rx="20" fill="#0f2a3a" />
        <text x="398" y="276" textAnchor="middle" fontFamily="var(--font-plex), monospace" fontSize="14" fill="#b99a5f">BERTH ACCOUNT</text>
        <text x="398" y="314" textAnchor="middle" fontFamily="var(--font-plex), monospace" fontSize="24" fill="#f2c14e">+1 day</text>
      </g>
      {[[262, 120], [300, 168], [340, 120]].map(([x, y], i) => (
        <g key={i} filter={`url(#${id}-c)`}>
          <ellipse cx={x} cy={y} rx="22" ry="22" fill={`url(#${id}-coin)`} />
          <text x={x} y={y + 6} textAnchor="middle" fontFamily="var(--font-fraunces), serif" fontSize="18" fill="#6f5527">$</text>
        </g>
      ))}
      <path d="M210 150 C 260 210, 300 220, 330 236" stroke="#0f2a3a" strokeOpacity="0.35" strokeWidth="3" strokeDasharray="4 8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function AllotmentScene() {
  const id = "s3";
  return (
    <svg viewBox="0 0 560 420" className="h-auto w-full" role="img" aria-label="An envelope inside a roped fence: the allotment can only go to the one house the crew member named">
      <Defs id={id} />
      <Ground id={id} fill="#fbfdfc" />
      <g>
        {[90, 160, 230, 300].map((x) => <rect key={x} x={x} y="190" width="14" height="110" rx="6" fill="#9c6b3f" filter={`url(#${id}-c)`} />)}
        <path d="M97 210 Q 132 230 167 210 Q 202 230 237 210 Q 272 230 307 210" stroke="#d9b679" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M97 262 Q 132 282 167 262 Q 202 282 237 262 Q 272 282 307 262" stroke="#d9b679" strokeWidth="9" fill="none" strokeLinecap="round" />
      </g>
      <g filter={`url(#${id}-c)`}>
        <rect x="128" y="110" width="140" height="92" rx="12" fill="#fffbf3" />
        <path d="M128 116 L198 166 L268 116" stroke="#c23d17" strokeWidth="5" fill="none" strokeLinejoin="round" />
      </g>
      <path d="M300 156 C 360 120, 400 130, 418 176" stroke="#c23d17" strokeWidth="3.5" strokeDasharray="3 9" strokeLinecap="round" fill="none" />
      <g filter={`url(#${id}-c)`}>
        <rect x="398" y="200" width="104" height="80" rx="10" fill="#fffbf3" />
        <path d="M388 204 L450 150 L512 204 Z" fill="#5fbdb8" />
        <rect x="438" y="240" width="22" height="40" rx="4" fill="#7d5a3a" />
        <rect x="412" y="222" width="18" height="16" rx="3" fill="#f2c14e" />
      </g>
      <g filter={`url(#${id}-c)`}>
        <rect x="60" y="322" width="250" height="40" rx="10" fill="#0f2a3a" />
        <text x="185" y="348" textAnchor="middle" fontFamily="var(--font-plex), monospace" fontSize="13" fill="#f2c14e">ONE RECEIVER · BUDGET · EXPIRY</text>
      </g>
    </svg>
  );
}

export function ReleaseScene() {
  const id = "s4";
  return (
    <svg viewBox="0 0 560 420" className="h-auto w-full" role="img" aria-label="A flare goes up and the locked months flow straight to the seafarer">
      <Defs id={id} />
      <Ground id={id} fill="#fbfdfc" />
      <path d="M150 300 C 160 220, 170 160, 182 92" stroke="#f39a78" strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
      <g filter={`url(#${id}-c)`}>
        <circle cx="184" cy="84" r="22" fill="#c23d17" />
        <circle cx="184" cy="84" r="10" fill="#ffd970" />
      </g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; return <path key={a} d={`M${184 + Math.cos(r) * 32} ${84 + Math.sin(r) * 32} L${184 + Math.cos(r) * 46} ${84 + Math.sin(r) * 46}`} stroke="#c23d17" strokeWidth="4" strokeLinecap="round" />; })}
      <g filter={`url(#${id}-c)`}>
        <rect x="90" y="300" width="130" height="64" rx="16" fill="#8a5531" />
        <path d="M90 322 h130" stroke="#f2c14e" strokeWidth="6" />
        <rect x="142" y="312" width="26" height="24" rx="6" fill="#f2c14e" opacity="0.5" />
      </g>
      <path d="M232 320 C 300 300, 340 300, 380 296" stroke="#0f2a3a" strokeOpacity="0.4" strokeWidth="3" strokeDasharray="4 8" fill="none" />
      {[260, 300, 340].map((x, i) => <ellipse key={x} cx={x} cy={306 - i * 3} rx="16" ry="16" fill="#ffd970" stroke="#e3a92c" strokeWidth="3" filter={`url(#${id}-c)`} />)}
      <g filter={`url(#${id}-c)`}>
        <rect x="400" y="234" width="60" height="96" rx="28" fill="#1f4a6b" />
        <rect x="400" y="274" width="60" height="9" fill="#f2c14e" />
        <circle cx="430" cy="210" r="27" fill="#b98457" />
        <path d="M400 204 Q 430 168 460 204 Z" fill="#c23d17" />
        <path d="M420 214 q10 8 20 0" stroke="#2a1d14" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
