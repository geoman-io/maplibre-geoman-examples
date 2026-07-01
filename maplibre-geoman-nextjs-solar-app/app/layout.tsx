import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SunPlan — Geoman Pro Rooftop Solar Demo",
  description:
    "A lightweight rooftop-solar mounting & planning app on MapLibre Geoman Pro: roof planes, obstructions, fire setbacks, auto panel-array layout, and a live system-size & production estimate. State persists in localStorage — no backend.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: browser extensions (LanguageTool, Grammarly, …)
    // inject attributes onto <html>/<body> before React hydrates, which would
    // otherwise throw a hydration mismatch and blank the page.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
