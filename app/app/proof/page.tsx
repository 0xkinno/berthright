import type { Metadata } from "next";
import { ProofRunner } from "./ProofRunner";
import { MainnetVoyage } from "./MainnetVoyage";
export const metadata: Metadata = { title: "Proof from chain · Berthright" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <p className="eyebrow">For skeptics</p>
      <h1 className="display mt-3 text-[40px] font-extrabold leading-[1] sm:text-[56px]">Recheck it from the chain.</h1>
      <p className="mt-5 max-w-3xl text-[18px] text-[color:var(--slate)]">Every check below runs in your browser against public NEAR RPC. Nothing comes from our server. A script twin is at <a className="underline" href="/proof.json">/proof.json</a>, and <span className="mono">npm run verify</span> rebuilds every ship from events from a clean clone with no keys.</p>
      <ProofRunner />
      <MainnetVoyage />
    </div>
  );
}
