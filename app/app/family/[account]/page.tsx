import type { Metadata } from "next";
import { Family } from "./Family";
export const metadata: Metadata = { title: "Allotments received · Berthright" };
export default async function Page({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  return <Family account={decodeURIComponent(account)} />;
}
