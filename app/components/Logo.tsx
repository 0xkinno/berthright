// The mark: a porthole read as a compass bezel, the lit crescent of a masthead lamp, and the berth chevron.
export function Mark({ size = 32, title = "Berthright" }: { size?: number; title?: string }) {
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}>
      <circle cx="24" cy="22" r="18" fill="#06121A" stroke="#C9A865" strokeWidth="1.6" />
      {ticks.map((a) => (
        <line key={a} x1="24" y1="5.5" x2="24" y2={a % 90 === 0 ? 9 : 7.4} stroke="#C9A865" strokeWidth={a % 90 === 0 ? 1.6 : 1} transform={`rotate(${a} 24 22)`} />
      ))}
      <circle cx="24" cy="22" r="10.5" fill="#0C2230" />
      <path d="M17.2 19 A8 8 0 0 1 30.6 17.4" fill="none" stroke="#F5B041" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M15 42.5 L24 37.5 L33 42.5" fill="none" stroke="#C53F17" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`display text-[23px] leading-none !tracking-[-0.03em] ${className}`}>Berthright</span>;
}
