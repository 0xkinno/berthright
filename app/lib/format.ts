import { TUSD_DECIMALS } from "./config";

/** Base units to a display string with two decimals, grouped, no floating point. */
export function tusd(base: string | number | bigint | undefined | null, decimals = 2): string {
  if (base === undefined || base === null || base === "") return "-";
  const v = BigInt(base);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const unit = 10n ** BigInt(TUSD_DECIMALS);
  const whole = abs / unit;
  const frac = ((abs % unit) * 10n ** BigInt(decimals)) / unit;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${grouped}${decimals ? "." + frac.toString().padStart(decimals, "0") : ""}`;
}

export function toBase(display: string): string {
  const [w, f = ""] = display.replace(/,/g, "").trim().split(".");
  return (BigInt(w || "0") * 10n ** BigInt(TUSD_DECIMALS) + BigInt((f + "000000").slice(0, TUSD_DECIMALS) || "0")).toString();
}

export function short(id?: string | null, n = 22): string {
  if (!id) return "-";
  return id.length <= n ? id : `${id.slice(0, Math.ceil(n / 2) - 1)}...${id.slice(-Math.floor(n / 2) + 2)}`;
}

export function nsToDate(ns?: string | number | null): string {
  if (!ns || ns === "0") return "-";
  return new Date(Number(BigInt(ns) / 1_000_000n)).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function secs(n: number): string {
  if (n < 60) return `${n}s`;
  if (n < 3600) return `${Math.floor(n / 60)}m ${n % 60}s`;
  return `${Math.floor(n / 3600)}h ${Math.floor((n % 3600) / 60)}m`;
}

export function months(x100?: string | number | null): string {
  if (x100 === undefined || x100 === null) return "-";
  return (Number(x100) / 100).toFixed(1);
}
