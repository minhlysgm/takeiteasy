import type { Metadata } from "next";
import { IBM_Plex_Mono, Patrick_Hand } from "next/font/google";
import "@/lib/theme.css";
import "./globals.css";

const mono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});
const hand = Patrick_Hand({
  subsets: ["latin", "vietnamese"],
  weight: "400",
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "takeiteasy — đọc sách học tiếng Anh",
  description: "Đọc sách song ngữ, học chunk theo ngữ cảnh",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${mono.variable} ${hand.variable}`}>
      <body className="min-h-dvh bg-bg font-mono text-text">
        <main className="min-h-dvh">{children}</main>
      </body>
    </html>
  );
}
