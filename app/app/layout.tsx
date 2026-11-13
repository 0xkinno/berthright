import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fraunces, instrument, plexMono } from "./fonts";
import { SessionProvider } from "@/components/Session";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "Berthright: four months of crew wages on board",
  description: "Each berth on a ship is a NEAR account that already holds four months of the crew member's wages. If the shipowner stops paying, the money is on board, not in a claim.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#06121A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrument.variable} ${plexMono.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[color:var(--ink)] focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
        <SessionProvider>
          <SmoothScroll />
          <Nav />
          <main id="main" className="pt-24 sm:pt-28">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
