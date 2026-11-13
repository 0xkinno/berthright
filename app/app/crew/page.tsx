import type { Metadata } from "next";
import { CrewBerth } from "./CrewBerth";

export const metadata: Metadata = { title: "Your berth · Berthright" };

export default function Page() {
  return <CrewBerth />;
}
