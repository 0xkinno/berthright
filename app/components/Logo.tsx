export function Mark({ size = 32, title = "Berthright" }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}>
      <circle cx="24" cy="22" r="17" fill="#0F2A3A" stroke="#C8B28A" strokeWidth="2.5" strokeDasharray="4 3" />
      <circle cx="24" cy="22" r="11.5" fill="none" stroke="#A88A54" strokeWidth="1.2" opacity="0.7" />
      <path d="M17 18.5 A9 9 0 0 1 31.5 17" fill="none" stroke="#F2C14E" strokeWidth="4" strokeLinecap="round" />
      <path d="M15 41 L24 36 L33 41" fill="none" stroke="#C23D17" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`text-[21px] font-bold leading-none tracking-[-0.01em] ${className}`}>Berthright</span>;
}
