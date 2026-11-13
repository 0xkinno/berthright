import type { Metadata } from "next";
import { BerthPublic } from "./BerthPublic";

export async function generateMetadata({ params }: { params: Promise<{ account: string }> }): Promise<Metadata> {
  const { account } = await params;
  return { title: `${decodeURIComponent(account)} · Berthright berth` };
}

export default async function Page({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  return <BerthPublic account={decodeURIComponent(account)} />;
}
