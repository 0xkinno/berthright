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
  { href: "/proof", label: "Proof" },
  { href: "/judge", label: "For judges" },
];

export function Nav() {
  const { wallet, connect, disconnect, connecting } = useSession();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-6">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 rounded-[18px] border border-[color:var(--hair)] bg-[color:var(--paper-hi)]/85 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_30px_-18px_rgba(17,20,15,0.5)] backdrop-blur-md sm:px-4">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-xl pr-2" aria-label="Berthright home">
          <Mark size={34} title="" />
          <Wordmark />
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-flex min-h-11 items-center rounded-xl px-3 text-[15px] font-medium text-[color:var(--ink)] hover:bg-black/5">{l.label}</Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <span className="pill hidden border border-[color:var(--hair)] bg-[color:var(--paper)] text-[color:var(--ink)] sm:inline-flex">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[color:var(--lemon)] shadow-[0_0_0_2px_rgba(17,20,15,0.25)]" />
            {NETWORK}
          </span>
          {wallet ? (
            <>
              <button
                type="button"
                onClick={async () => { await navigator.clipboard?.writeText(wallet.accountId); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
                className="hidden min-h-11 items-center gap-2 rounded-xl border border-[color:var(--hair)] px-3 font-mono text-[13px] sm:inline-flex"
                aria-label={`Account ${wallet.accountId}. Copy`}
              >
                {copied ? "Copied" : short(wallet.accountId, 18)} <Copy size={14} aria-hidden />
              </button>
              <button type="button" onClick={disconnect} className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--ink)] text-[color:var(--lemon)]" aria-label="Disconnect" title="Disconnect">
                <Power size={18} aria-hidden />
              </button>
            </>
          ) : (
            <button type="button" onClick={connect} disabled={connecting} className="btn btn-ink !min-h-11 !rounded-xl !px-3 sm:!px-4">
              <span>{connecting ? "Opening" : "Connect"}</span>
              <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--lemon)] text-[color:var(--ink)]"><ArrowRight size={14} /></span>
            </button>
          )}
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-xl lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="mx-auto mt-2 max-w-6xl rounded-[18px] border border-[color:var(--hair)] bg-[color:var(--paper-hi)] p-2 shadow-xl lg:hidden">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-4 text-[17px] font-medium hover:bg-black/5">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
