import type { Metadata } from "next";
import { ShipView } from "./ShipView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Ship #${id} · Berthright` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShipView id={id} />;
}
