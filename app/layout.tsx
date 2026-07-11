import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ConditionalSiteChrome from "@/components/ConditionalSiteChrome";
import SiteChrome from "@/components/SiteChrome";
import Providers from "@/components/Providers";
import { siteConfig } from "@/lib/data";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} - ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "Türkiye'nin en güzel bölgelerinde villa ve bungalov kiralama. En iyi fiyat garantisi ile hızlı rezervasyon.",
  // TÜRSAB DDS doğrulaması için referrer origin gerekli (rel=noreferrer kullanılmamalı)
  referrer: "origin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-gray-900">
        <Providers>
          <ConditionalSiteChrome
            adminContent={children}
            publicContent={<SiteChrome>{children}</SiteChrome>}
          />
        </Providers>
      </body>
    </html>
  );
}
