"use client";
// One place that knows who is acting: a connected wallet, or the browser-key accounts the judge
// run created. Pages ask for a signer for a role ("crew", "owner") and get one or a clear reason.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { browserSigner, getConnector, getKey, walletSigner, type Signer } from "@/lib/near";

type Judge = { owner: { accountId: string; secretKey: string }; crew: { accountId: string; secretKey: string }; family: { accountId: string; secretKey: string }; berth: string; shipId?: string };

interface Ctx {
  wallet: Signer | null;
  judge: Judge | null;
  connecting: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signerFor(role: "crew" | "owner" | "family" | "any"): Promise<Signer | null>;
  refreshJudge(): Promise<void>;
}

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Signer | null>(null);
  const [judge, setJudge] = useState<Judge | null>(null);
  const [connecting, setConnecting] = useState(false);

  const refreshJudge = useCallback(async () => {
    try { setJudge((await getKey<Judge>("judge")) ?? null); } catch { setJudge(null); }
  }, []);

  useEffect(() => {
    refreshJudge();
    let alive = true;
    (async () => {
      try {
        const c = await getConnector();
        const update = async () => { const s = await walletSigner(); if (alive) setWallet(s); };
        c.on("wallet:signIn", update);
        c.on("wallet:signOut", () => alive && setWallet(null));
        await update();
      } catch {}
    })();
    return () => { alive = false; };
  }, [refreshJudge]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const c = await getConnector();
      await c.connect();
      setWallet(await walletSigner());
    } catch {} finally { setConnecting(false); }
  }, []);

  const disconnect = useCallback(async () => {
    try { const c = await getConnector(); await c.disconnect(); } catch {}
    setWallet(null);
  }, []);

  const signerFor = useCallback(async (role: "crew" | "owner" | "family" | "any") => {
    if (wallet) return wallet;
    const j = judge ?? (await getKey<Judge>("judge"));
    if (!j) return null;
    const who = role === "owner" ? j.owner : role === "family" ? j.family : j.crew;
    return browserSigner(who.accountId, who.secretKey);
  }, [wallet, judge]);

  return <SessionCtx.Provider value={{ wallet, judge, connecting, connect, disconnect, signerFor, refreshJudge }}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("useSession outside SessionProvider");
  return c;
}
