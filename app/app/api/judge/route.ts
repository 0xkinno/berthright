import { NextResponse } from "next/server";
import { IDS, DEPLOYED } from "@/lib/config";
import { serverAccount, fnCall } from "@/lib/server-near";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Per-instance counters. Serverless instances do not share memory, so these caps are a speed bump,
// not a wall; the sponsor's own balance is the real limit and is checked first.
const perIp = new Map<string, { day: string; n: number }>();
let total = { day: "", n: 0 };
const NEAR = 10n ** 24n;
const milli = (n: number) => (BigInt(Math.round(n * 1000)) * NEAR) / 1000n;
const PK = /^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/;

export async function POST(req: Request) {
  if (process.env.KILL_SWITCH === "1") return NextResponse.json({ ok: false, reason: "The judge run is switched off by the operator right now." }, { status: 503 });
  if (!DEPLOYED) return NextResponse.json({ ok: false, reason: "The contracts are not deployed to testnet yet." }, { status: 503 });
  const sponsor = serverAccount("JUDGE_SPONSOR_ACCOUNT_ID", "JUDGE_SPONSOR_PRIVATE_KEY");
  const trust = serverAccount("TRUST_ACCOUNT_ID", "TRUST_PRIVATE_KEY");
  if (!sponsor || !trust) return NextResponse.json({ ok: false, reason: "The judge sponsor or the crew welfare trust key is not configured on this deployment." }, { status: 503 });

  const day = new Date().toISOString().slice(0, 10);
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const capIp = Number(process.env.JUDGE_PER_IP_CAP ?? 20), capDay = Number(process.env.JUDGE_DAILY_CAP ?? 300);
  const mine = perIp.get(ip);
  if (mine?.day === day && mine.n >= capIp) return NextResponse.json({ ok: false, reason: `This address already started ${capIp} judge runs today.` }, { status: 429 });
  if (total.day === day && total.n >= capDay) return NextResponse.json({ ok: false, reason: "Today's judge runs are used up. Try again tomorrow (UTC)." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const keys = [body?.ownerPk, body?.crewPk, body?.familyPk];
  if (!keys.every((k) => typeof k === "string" && PK.test(k))) return NextResponse.json({ ok: false, reason: "Send three ed25519 public keys created in your browser." }, { status: 400 });

  const bal = BigInt((await sponsor.getBalance()) as unknown as string);
  if (bal < milli(3)) return NextResponse.json({ ok: false, reason: "The judge sponsor account is out of testnet NEAR. The operator has been asked to top it up." }, { status: 503 });

  const rand = Math.random().toString(36).slice(2, 8);
  const base = sponsor.accountId;
  const ids = { owner: `j${rand}-owner.${base}`, crew: `j${rand}-crew.${base}`, family: `j${rand}-family.${base}` };
  const txs: Record<string, string> = {};
  try {
    for (const [role, near, pk] of [["owner", 0.6, keys[0]], ["crew", 0.6, keys[1]], ["family", 0.15, keys[2]]] as const) {
      const r: any = await sponsor.createSubAccount({ accountOrPrefix: ids[role], publicKey: pk, nearToTransfer: milli(near) } as never);
      txs[`create_${role}`] = r?.transaction?.hash ?? r?.transaction_outcome?.id ?? "";
    }
    const berthName = `j${rand}-ab2`;
    const minted = await fnCall(trust, IDS.registry, "rent_sub_account_paid", {
      tla_id: IDS.registrar, name: berthName, owner_account: ids.crew, payout_account: ids.crew, order_id: `judge-${rand}-${Date.now()}`,
    }, milli(0.3));
    txs.issue_berth = minted.hash;
    if (!minted.ok) throw new Error(`berth issue failed: ${minted.failure}`);
    perIp.set(ip, { day, n: (mine?.day === day ? mine.n : 0) + 1 });
    total = { day, n: (total.day === day ? total.n : 0) + 1 };
    return NextResponse.json({ ok: true, accounts: ids, berth: `${berthName}.${IDS.registrar}`, txs });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: `Testnet refused to set up the run: ${(e as Error).message.slice(0, 200)}`, txs }, { status: 502 });
  }
}
