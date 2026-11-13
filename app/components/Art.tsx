// Section art: 1.5 px strokes, brass and ink, one lemon fill each.
const S = { stroke: "#11140F", strokeWidth: 1.5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const B = { ...S, stroke: "#A88A54" };

export function LockArt() {
  return (
    <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden>
      <rect x="14" y="28" width="36" height="26" rx="5" fill="#D4F25C" stroke="#11140F" strokeWidth="1.5" />
      <path d="M22 28 V20 a10 10 0 0 1 20 0 V28" {...S} />
      <circle cx="32" cy="40" r="3" {...S} /><path d="M32 43 V48" {...S} />
      <path d="M8 58 H56" {...B} />
    </svg>
  );
}
export function TideArt() {
  return (
    <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden>
      <rect x="22" y="6" width="20" height="52" rx="4" {...S} />
      <rect x="23" y="30" width="18" height="27" rx="3" fill="#D4F25C" />
      {[14, 22, 30, 38, 46].map((y) => <path key={y} d={`M42 ${y} H48`} {...B} />)}
      <path d="M6 44 q6 -4 12 0 t12 0" {...S} />
    </svg>
  );
}
export function EnvelopeArt() {
  return (
    <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden>
      <rect x="12" y="20" width="40" height="26" rx="3" fill="#D4F25C" stroke="#11140F" strokeWidth="1.5" />
      <path d="M12 22 L32 36 L52 22" {...S} />
      {[8, 18, 28, 38, 48, 58].map((x) => <path key={x} d={`M${x} 54 V44`} {...B} />)}
      <path d="M4 50 H60" {...B} />
    </svg>
  );
}
export function FlareArt() {
  return (
    <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden>
      <path d="M32 58 V30" {...S} />
      <circle cx="32" cy="20" r="9" fill="#D4F25C" stroke="#11140F" strokeWidth="1.5" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return <path key={a} d={`M${32 + Math.cos(r) * 13} ${20 + Math.sin(r) * 13} L${32 + Math.cos(r) * 18} ${20 + Math.sin(r) * 18}`} {...B} />;
      })}
      <path d="M18 58 H46" {...S} />
    </svg>
  );
}
export function PortageArt() {
  return (
    <svg viewBox="0 0 120 150" width="120" height="150" aria-hidden>
      <rect x="6" y="6" width="108" height="138" rx="4" fill="#F7F6F0" stroke="#11140F" strokeWidth="1.5" />
      <path d="M18 24 H72" stroke="#11140F" strokeWidth="2.5" />
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M18 ${44 + i * 10} H102`} {...B} />)}
      <path d="M70 40 V134" {...B} />
      <rect x="74" y="104" width="28" height="9" fill="#D4F25C" />
    </svg>
  );
}
