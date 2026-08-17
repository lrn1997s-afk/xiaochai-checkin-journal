import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const siteOrigin = "https://www.shibadiary.com";

const enjoyable = localFont({
  src: "./fonts/ELEYANG-Enjoyable-Regular.woff2",
  variable: "--font-src-enjoyable",
  display: "swap",
});

const influencer = localFont({
  src: "./fonts/ELEYANG-Influencer-Regular.woff2",
  variable: "--font-src-influencer",
  display: "swap",
});

const zcoolKuaiLe = localFont({
  src: "./fonts/zcool-kuaile.woff2",
  variable: "--font-src-zcool-kuaile",
  display: "swap",
});

export const metadata: Metadata = {
  title: "小柴打卡手帐",
  description: "手帐风健康打卡小程序，记录运动、餐食、积分和小伙伴排行榜。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "小柴打卡手帐",
    description: "把运动和餐食认真贴进每天的小手帐。",
    images: [{ url: `${siteOrigin}/og.png`, width: 1200, height: 630, alt: "小柴打卡手帐分享预览" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "小柴打卡手帐",
    description: "把运动和餐食认真贴进每天的小手帐。",
    images: [`${siteOrigin}/og.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${enjoyable.variable} ${influencer.variable} ${zcoolKuaiLe.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
