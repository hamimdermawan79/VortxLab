import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "VortX Labs — Serverless AI Models & Automation Tools",
  description: "Semua kebutuhan komputasi AI inferensi dan tools otomatisasi dalam satu web platform.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

import VisitorTracker from "@/components/VisitorTracker";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="light">
      <body className={`${jetbrains.variable} ${jetbrains.className} font-mono bg-bg text-text antialiased min-h-screen font-normal`}>
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}