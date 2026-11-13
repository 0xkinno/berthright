"use client";
import { useCallback, useEffect, useState } from "react";
import { IDS, DEPLOYED } from "@/lib/config";
import { pinnedBerth, view, RpcDown } from "@/lib/near";

export interface BerthData {
  pinned: Awaited<ReturnType<typeof pinnedBerth>> | null;
  berth: any | null;
  ship: any | null;
  coverage: any | null;
  quote: any | null;
  history: any[];
  allotment: any | null;
  inBerth: string;
  error: string | null;
  loading: boolean;
}

export function useBerth(account: string | null, intervalMs = 8000) {
  const [d, setD] = useState<BerthData>({ pinned: null, berth: null, ship: null, coverage: null, quote: null, history: [], allotment: null, inBerth: "0", error: null, loading: true });
  const load = useCallback(async () => {
    if (!account) { setD((x) => ({ ...x, loading: false })); return; }
    if (!DEPLOYED) { setD((x) => ({ ...x, loading: false, error: "The contracts are not deployed to testnet yet." })); return; }
    try {
      const [pinned, berth, history, allotment, inBerth] = await Promise.all([
        pinnedBerth(account).catch(() => null),
        view<any>(IDS.portage, "get_berth", { berth: account }, { ttlMs: 0 }),
        view<any[]>(IDS.portage, "berth_history", { berth: account }, { ttlMs: 0 }),
        view<any>(IDS.allotment, "get_allotment", { berth: account }, { ttlMs: 0 }),
        view<string>(IDS.tusd, "ft_balance_of", { account_id: account }, { ttlMs: 0 }).catch(() => "0"),
      ]);
      let ship = null, coverage = null, quote = null;
      if (berth) {
        [ship, coverage, quote] = await Promise.all([
          view<any>(IDS.portage, "get_ship", { ship_id: berth.ship_id }, { ttlMs: 0 }),
          view<any>(IDS.portage, "coverage", { ship_id: berth.ship_id }, { ttlMs: 0 }),
          view<any>(IDS.portage, "quote_settle", { berth: account }, { ttlMs: 0 }),
        ]);
      }
      setD({ pinned, berth, ship, coverage, quote, history: history ?? [], allotment, inBerth, error: null, loading: false });
    } catch (e) {
      setD((x) => ({ ...x, loading: false, error: e instanceof RpcDown ? "Testnet RPC is not answering right now. Nothing shown here is stale: it is missing." : `Could not read this berth: ${(e as Error).message.slice(0, 160)}` }));
    }
  }, [account]);
  useEffect(() => { load(); const t = setInterval(load, intervalMs); return () => clearInterval(t); }, [load, intervalMs]);
  return { ...d, reload: load };
}
