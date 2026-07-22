import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "たびの健康手帳",
  description: "愛猫たびの健康管理アプリ",
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/favicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "たびの健康手帳",
  },
  // apple-mobile-web-app-capable alone is deprecated; browsers now expect this name
  other: { "mobile-web-app-capable": "yes" },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/yakuhanjp@3.4.1/dist/css/yakuhanjp.min.css" />
      </head>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
        <BottomNav />
        <SpeedInsights />
        {/* iOS Safari ignores user-scalable=no, so suppress pinch-zoom explicitly */}
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('touchmove', function(e) {
            if (e.touches.length > 1) e.preventDefault();
          }, { passive: false });
          document.addEventListener('focusout', function() {
            var viewport = document.querySelector('meta[name=viewport]');
            if (viewport) {
              viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
            }
          });
        `}} />
      </body>
    </html>
  );
}
