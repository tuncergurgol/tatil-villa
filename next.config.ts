import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Deploy sırasında canlı .next'i bozmamak için staging build klasörü
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Deploy hızı: SKIP_TS_CHECK=1 ile typecheck atlanır (~1–2 dk kazanç)
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TS_CHECK === "1",
  },
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
    optimizePackageImports: ["lucide-react"],
    inlineCss: true,
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
      {
        source: "/:key([a-fA-F0-9]{32}).txt",
        destination: "/api/indexnow-key?key=:key",
      },
      {
        source: "/.well-known/llms.txt",
        destination: "/llms.txt",
      },
      {
        source: "/.well-known/llms-full.txt",
        destination: "/llms-full.txt",
      },
    ];
  },
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    minimumCacheTTL: 60 * 60 * 24 * 30,
    qualities: [50, 60, 65, 70, 75, 80],
    deviceSizes: [640, 750, 828, 1080, 1200, 1400, 1920, 2048, 3840],
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
  webpack: (config, { dev, isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "../build/polyfills/polyfill-module": false,
        "../build/polyfills/polyfill-module.js": false,
        "next/dist/build/polyfills/polyfill-module": false,
        "next/dist/build/polyfills/polyfill-module.js": false,
      };
    }
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
