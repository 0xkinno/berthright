"use client";
import { useEffect, useState } from "react";

// Ship's time off Khor Fakkan (UTC+4), ticking. Rendered only after mount so server and client agree.
export function ShipClock({ className = "" }: { className?: string }) {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    const f = () => setT(new Date(Date.now() + 4 * 3600e3).toISOString().slice(11, 19));
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className={`mono ${className}`} suppressHydrationWarning>{t ?? "--:--:--"} SHIP TIME</span>;
}
