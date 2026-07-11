import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-ical"],
  outputFileTracingExcludes: {
    "*": ["public/uploads/**"],
  },
  async rewrites() {
    return [
      {
        source: "/ics/:villaId/:token",
        destination: "/api/ics/:villaId/:token",
      },
    ];
  },
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
  webpack: (config, { dev }) => {
    if (dev) {
      const current = config.watchOptions?.ignored;
      const base = Array.isArray(current) ? current : current ? [current] : [];
      const ignored = [
        ...base.filter(
          (pattern): pattern is string =>
            typeof pattern === "string" && pattern.trim().length > 0
        ),
        "**/waha/**",
        "**/evolution/**",
        "**/public/uploads/**",
        "**/.git/**",
        "**/scripts/**",
      ];
      config.watchOptions = {
        ...config.watchOptions,
        ignored,
        // OneDrive dosya kilidi / yavaş I/O için polling
        poll: 1000,
        aggregateTimeout: 500,
      };
    }
    return config;
  },
};

export default nextConfig;
