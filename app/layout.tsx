import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "たびの健康手帳",
  description: "愛猫たびの健康管理アプリ",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    apple: "/icon.png",
    icon: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "たびの健康手帳",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('touchmove', function(e) {
            if (e.touches.length > 1) e.preventDefault();
          }, { passive: false });
        `}} />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <BottomNav />
        <SpeedInsights />
      </body>
    </html>
  );
}
