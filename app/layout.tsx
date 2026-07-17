import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ConditionalSiteChrome from "@/components/ConditionalSiteChrome";
import SiteChrome from "@/components/SiteChrome";
import Providers from "@/components/Providers";
import { buildRootMetadata } from "@/lib/site-metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  return buildRootMetadata();
}

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
