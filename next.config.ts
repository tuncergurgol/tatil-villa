import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "r2.tatildeyiz.com.tr",
      },
      {
        protocol: "https",
        hostname: "r2.fluxesoft.com",
      },
    ],
  },
};

export default nextConfig;
