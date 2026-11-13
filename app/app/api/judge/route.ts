import { NextResponse } from "next/server";
import { IDS, DEPLOYED } from "@/lib/config";
import { serverAccount, fnCall } from "@/lib/server-near";
import { PublicKey } from "near-api-js";
import { NEAR as NEAR_TOKEN } from "near-api-js/tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Per-instance counters. Serverless instances do not share memory, so these caps are a speed bump,
// not a wall; the sponsor's own balance is the real limit and is checked first.
const perIp = new Map<string, { day: string; n: number }>();
let total = { day: "", n: 0 };
const NEAR = 10n ** 24n;
const milli = (n: number) => (BigInt(Math.round(n * 1_000_000)) * NEAR) / 1_000_000n;
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
  if (bal < milli(0.5)) return NextResponse.json({ ok: false, reason: "The judge sponsor account is out of testnet NEAR. The operator has been asked to top it up." }, { status: 503 });

  // Judge wallets are implicit accounts: the id is the browser key itself, so the sponsor only sends
  // a small grant (no sub-account to create) and the server never holds a judge key.
  const implicit = (pk: string) => Buffer.from(PublicKey.fromString(pk).data).toString("hex");
  const rand = Math.random().toString(36).slice(2, 8);
  const ids = { owner: implicit(keys[0]), crew: implicit(keys[1]), family: implicit(keys[2]) };
  const txs: Record<string, string> = {};
  try {
    // Sized from measured runs. NEAR reserves prepaid gas at a pessimistic price (about 0.1 NEAR per
    // 100 Tgas, refunded), so each account must hold enough for its largest single call.
    for (const [role, near] of [["owner", 0.3], ["crew", 0.15], ["family", 0.12]] as const) {
      const r: any = await sponsor.transfer({ token: NEAR_TOKEN, amount: milli(near), receiverId: ids[role] } as never);
      txs[`grant_${role}`] = r?.transaction?.hash ?? r?.transaction_outcome?.id ?? "";
    }
    const berthName = `j${rand}-ab2`;
    const minted = await fnCall(trust, IDS.registry, "rent_sub_account_paid", {
      tla_id: IDS.registrar, name: berthName, owner_account: ids.crew, payout_account: ids.crew, order_id: `judge-${rand}-${Date.now()}`,
    }, milli(0.1));
    txs.issue_berth = minted.hash;
    if (!minted.ok) throw new Error(`berth issue failed: ${minted.failure}`);
    perIp.set(ip, { day, n: (mine?.day === day ? mine.n : 0) + 1 });
    total = { day, n: (total.day === day ? total.n : 0) + 1 };
    return NextResponse.json({ ok: true, accounts: ids, berth: `${berthName}.${IDS.registrar}`, txs });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: `Testnet refused to set up the run: ${(e as Error).message.slice(0, 200)}`, txs }, { status: 502 });
  }
}
