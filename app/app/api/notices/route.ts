import { NextResponse } from "next/server";
import { JsonRpcProvider } from "near-api-js";
import { verifyMessage } from "near-api-js/nep413";
import { IDS, RPC_URLS } from "@/lib/config";
import { pinnedBerth, view } from "@/lib/near";

export const dynamic = "force-dynamic";
import { NOTICE_RECIPIENT as RECIPIENT } from "@/lib/near";

// The gated page: only the berth's current holder gets the crew notices. The holder signs a
// NEP-413 message; we check the signature, that the key is a full-access key of that account,
// that the message is fresh and meant for us, and that the berth (read with nft_item_info and the
// registry's nft_token at one block) names that account as its owner.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.berth || !b?.accountId || !b?.publicKey || !b?.signature || !b?.message || !b?.nonce) return NextResponse.json({ ok: false, reason: "Missing fields." }, { status: 400 });
  const m = String(b.message).match(/^Open crew notices for (\S+) at (\d{4}-\d\d-\d\dT[\d:.]+Z)$/);
  if (!m || m[1] !== b.berth) return NextResponse.json({ ok: false, reason: "The signed message is not a crew-notice request for this berth." }, { status: 400 });
  if (Math.abs(Date.now() - Date.parse(m[2])) > 5 * 60_000) return NextResponse.json({ ok: false, reason: "The signed message is older than five minutes. Sign again." }, { status: 401 });
  try {
    const nonce = Uint8Array.from(Buffer.from(b.nonce, "base64"));
    const signature = Uint8Array.from(Buffer.from(b.signature, "base64"));
    await verifyMessage({ signerAccountId: b.accountId, signerPublicKey: b.publicKey, payload: { message: b.message, recipient: RECIPIENT, nonce } as never, signature, provider: new JsonRpcProvider({ url: RPC_URLS[0] }) as never });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: `Signature check failed: ${(e as Error).message.slice(0, 160)}` }, { status: 401 });
  }
  const p = await pinnedBerth(b.berth);
  if (!p.agree || p.item.owner_id !== b.accountId) return NextResponse.json({ ok: false, reason: "You signed correctly, but you are not the current holder of this berth.", block: p.block.height }, { status: 403 });

  const berth = await view<any>(IDS.portage, "get_berth", { berth: b.berth }, { ttlMs: 0 }).catch(() => null);
  const allot = await view<any>(IDS.allotment, "get_allotment", { berth: b.berth }, { ttlMs: 0 }).catch(() => null);
  const cov = berth ? await view<any>(IDS.portage, "coverage", { ship_id: berth.ship_id }, { ttlMs: 0 }).catch(() => null) : null;
  const notices = [
    { title: "Your guarantee", body: berth ? `Locked for you now: ${berth.reserve} base units of tUSD (four months and the fare home). Not covered: anything beyond that.` : "You are not signed on to a ship through Berthright yet." },
    { title: "Wages", body: cov && BigInt(cov.arrears ?? "0") > 0n ? `Your ship owes unpaid wages. If they are still unpaid in ${cov.grace_left_secs} seconds of ship time, anyone can release your guarantee to your own account.` : "Wages are current." },
    { title: "Allotment", body: allot ? (allot.stopped ? `Your allotment is stopped: ${allot.stopped}.` : `Next allotment to ${allot.receiver} is due at ${new Date(Number(BigInt(allot.next_due_ns) / 1_000_000n)).toISOString()}.`) : "No allotment set." },
    { title: "If your phone is stolen", body: "Freeze the berth from any device signed in to your own account. Wages keep arriving; nothing can leave while it is frozen." },
    { title: "Help ashore", body: "The ITF publishes seafarer support contacts at itfseafarers.org." },
  ];
  return NextResponse.json({ ok: true, holder: b.accountId, block: p.block.height, rotation_seq: p.item.rotation_seq, notices });
}
