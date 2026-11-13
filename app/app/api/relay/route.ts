import { NextResponse } from "next/server";
import { decodeSignedDelegate } from "near-api-js";
import { IDS } from "@/lib/config";
import { serverAccount } from "@/lib/server-near";
import { parseOutcome } from "@/lib/near";

export const dynamic = "force-dynamic";

// NEP-366 relayer. It pays gas for a signed delegate action only when every action is a function
// call to our contracts, the registry, or a berth under the crew namespace, with an allowed method,
// no deposit beyond the 1 yocto berths require, and bounded gas. It never signs anything else.
const ALLOWED: Record<string, string[]> = {
  portage: ["sign_on", "sign_off", "settle", "declare_abandonment", "release_guarantee"],
  allotment: ["set_allotment", "run", "stop"],
  registry: ["nft_transfer"],
  berth: ["w_execute_extension", "hos_grant_spend", "hos_revoke_spend", "hos_freeze", "hos_unfreeze"],
};
const MAX_GAS = 300n * 10n ** 12n;
const hits = new Map<string, { day: string; n: number }>();

function roleOf(receiver: string): keyof typeof ALLOWED | null {
  if (receiver === IDS.portage) return "portage";
  if (receiver === IDS.allotment) return "allotment";
  if (receiver === IDS.registry) return "registry";
  const label = receiver.endsWith(`.${IDS.registrar}`) ? receiver.slice(0, -IDS.registrar.length - 1) : null;
  if (label && !label.includes(".")) return "berth";
  return null;
}

export async function POST(req: Request) {
  if (process.env.KILL_SWITCH === "1") return NextResponse.json({ ok: false, reason: "The relayer is switched off by the operator." }, { status: 503 });
  const relayer = serverAccount("RELAYER_ACCOUNT_ID", "RELAYER_PRIVATE_KEY");
  if (!relayer) return NextResponse.json({ ok: false, reason: "No relayer is configured on this deployment; sign with your own account instead." }, { status: 503 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  const h = hits.get(ip);
  if (h?.day === day && h.n >= Number(process.env.RELAY_PER_IP_CAP ?? 60)) return NextResponse.json({ ok: false, reason: "Relay limit for today reached from this address." }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (typeof body?.signedDelegate !== "string") return NextResponse.json({ ok: false, reason: "Send { signedDelegate: base64 }." }, { status: 400 });
  let sd: any;
  try { sd = decodeSignedDelegate(Uint8Array.from(Buffer.from(body.signedDelegate, "base64"))); } catch { return NextResponse.json({ ok: false, reason: "Not a signed delegate action." }, { status: 400 }); }
  const da = sd.delegateAction;
  const role = roleOf(da.receiverId);
  if (!role) return NextResponse.json({ ok: false, reason: `The relayer does not pay for calls to ${da.receiverId}.` }, { status: 403 });
  for (const a of da.actions) {
    const fc = a.functionCall;
    if (!fc) return NextResponse.json({ ok: false, reason: "Only function calls are relayed." }, { status: 403 });
    if (!ALLOWED[role].includes(fc.methodName)) return NextResponse.json({ ok: false, reason: `Method ${fc.methodName} is not relayed.` }, { status: 403 });
    const dep = BigInt(fc.deposit);
    if (dep > 1n) return NextResponse.json({ ok: false, reason: "The relayer never attaches value; only the 1 yocto a berth requires, paid by the signer." }, { status: 403 });
    if (BigInt(fc.gas) > MAX_GAS) return NextResponse.json({ ok: false, reason: "Gas above the cap." }, { status: 403 });
  }
  try {
    const res = await relayer.relayMetaTransaction(sd);
    hits.set(ip, { day, n: (h?.day === day ? h.n : 0) + 1 });
    return NextResponse.json({ ok: true, outcome: parseOutcome(res) });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: `Testnet refused the relayed transaction: ${(e as Error).message.slice(0, 200)}` }, { status: 502 });
  }
}
