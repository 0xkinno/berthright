"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, Power, X, ArrowRight, Copy } from "lucide-react";
import { Mark, Wordmark } from "./Logo";
import { useSession } from "./Session";
import { NETWORK } from "@/lib/config";
import { short } from "@/lib/format";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/crew", label: "The berth" },
  { href: "/berths", label: "Register" },
  { href: "/proof", label: "Proof" },
  { href: "/judge", label: "For judges" },
];

export function Nav() {
  const { wallet, connect, disconnect, connecting } = useSession();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-2 sm:px-6">
      <nav aria-label="Main" className="relative mx-auto mt-3 flex h-16 max-w-[1344px] items-center justify-between gap-3 rounded-full border border-white/10 bg-[color:var(--night)]/85 pl-3 pr-2 text-[#eef3f5] shadow-[0_18px_40px_-18px_rgba(6,18,26,0.7)] backdrop-blur-xl sm:pl-5">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-xl pr-2" aria-label="Berthright home">
          <Mark size={34} title="" />
          <Wordmark />
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="stitch-link inline-flex min-h-11 items-center px-3 font-mono text-[13px] uppercase tracking-[0.14em] text-[#eef3f5]">{l.label}</Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <span className="pill hidden border border-white/15 text-[#eef3f5] sm:inline-flex">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[color:var(--signal-bright)] shadow-[0_0_0_3px_rgba(63,191,155,0.25)]" />
            {NETWORK}
          </span>
          {wallet ? (
            <>
              <button
                type="button"
                onClick={async () => { await navigator.clipboard?.writeText(wallet.accountId); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
                className="hidden min-h-11 items-center gap-2 rounded-full border border-white/15 px-3 font-mono text-[13px] sm:inline-flex"
                aria-label={`Account ${wallet.accountId}. Copy`}
              >
                {copied ? "Copied" : short(wallet.accountId, 18)} <Copy size={14} aria-hidden />
              </button>
              <button type="button" onClick={disconnect} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--flare)] text-white" aria-label="Disconnect" title="Disconnect">
                <Power size={18} aria-hidden />
              </button>
            </>
          ) : (
            <button type="button" onClick={connect} disabled={connecting} className="btn btn-lemon !min-h-11 !px-4 sm:!px-5">
              <span>{connecting ? "Opening" : "Connect"}</span>
              <ArrowRight size={15} aria-hidden />
            </button>
          )}
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="night mx-auto mt-2 max-w-6xl rounded-3xl border border-white/10 p-3 lg:hidden">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-2xl px-4 font-mono text-[14px] uppercase tracking-[0.14em] hover:bg-white/5">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
