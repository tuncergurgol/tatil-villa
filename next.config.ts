import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // pdfkit/fontkit: webpack vendor-chunks Helvetica.afm yolunu bozar (ENOENT .next/.../data/)
  serverExternalPackages: [
    "@prisma/client",
    "node-ical",
    "pdfkit",
    "fontkit",
  ],
  outputFileTracingExcludes: {
    "*": ["public/uploads/**"],
  },
  experimental: {
    serverMinification: false,
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin-allow-popups",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/bilet/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "frame-ancestors 'self' https://iframe.biletall.com https://*.biletall.com",
              "frame-src 'self' https://iframe.biletall.com https://*.biletall.com",
              "child-src 'self' https://iframe.biletall.com https://*.biletall.com",
            ].join("; "),
          },
        ],
      },
      {
        source: "/tur",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "frame-src 'self' https://whitelabel.tursabrota.com https://*.tursabrota.com",
              "child-src 'self' https://whitelabel.tursabrota.com https://*.tursabrota.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/villalar/:slug",
        destination: "/:slug",
        permanent: true,
      },
      {
        source: "/:locale(en|de|fr|es|bg|el|zh)/villalar/:slug",
        destination: "/:locale/:slug",
        permanent: true,
      },
      {
        source: "/ucak-otobus",
        destination: "/bilet/ara",
        permanent: true,
      },
    ];
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
      {
        protocol: "https",
        hostname: "storage.fluxesoft.com",
      },
      {
        protocol: "https",
        hostname: "image.otelz.com",
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

export default withNextIntl(nextConfig);
