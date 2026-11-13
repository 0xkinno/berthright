export function Mark({ size = 32, title = "Berthright" }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}>
      <circle cx="24" cy="22" r="17" fill="#11140F" stroke="#A88A54" strokeWidth="2.5" />
      <circle cx="24" cy="22" r="11.5" fill="none" stroke="#A88A54" strokeWidth="1.2" opacity="0.7" />
      <path d="M17 18.5 A9 9 0 0 1 31.5 17" fill="none" stroke="#D4F25C" strokeWidth="4" strokeLinecap="round" />
      <path d="M15 41 L24 36 L33 41" fill="none" stroke="#11140F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`display text-[22px] font-bold leading-none ${className}`}>Berthright</span>;
}
