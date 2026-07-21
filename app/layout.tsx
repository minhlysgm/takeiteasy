import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

const display = Baloo_2({ subsets: ["latin", "vietnamese"], weight: ["700", "800"], variable: "--font-display" });
const body = Nunito({ subsets: ["latin", "vietnamese"], weight: ["400", "600"], variable: "--font-body" });

export const metadata: Metadata = { title: "Ghép Câu", description: "Học tiếng Anh giao tiếp cho người Việt đi làm" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable}`}>
      <body className="font-body bg-page text-ink min-h-dvh">{children}</body>
    </html>
  );
}
