import type { Metadata } from "next";
import { Syne, Manrope, IBM_Plex_Mono } from "next/font/google";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WLSN — Event & Concert Photography",
  description:
    "Wilson (CRISPTAKES) shoots talks, workshops, graduations, and concerts. Book a shoot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${manrope.variable} ${plexMono.variable}`}>
      <body className="font-body bg-paper text-ink antialiased">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
