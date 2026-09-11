/**
 * Public site marka görselleri — Acente Siteleri sekmesinden indirme listesi.
 * Dosyalar `public/brands/{key}/` altında tutulur.
 */

export type PublicBrandAsset = {
  label: string;
  path: string;
  fileName: string;
};

export type PublicBrandAssetGroup = {
  key: string;
  label: string;
  domain: string;
  assets: PublicBrandAsset[];
};

export const PUBLIC_BRAND_ASSET_GROUPS: PublicBrandAssetGroup[] = [
  {
    key: "balayi-villacisi",
    label: "Balayı Villacısı",
    domain: "www.balayivillacisi.com",
    assets: [
      {
        label: "Logo",
        path: "/brands/balayi-villacisi/logo.png",
        fileName: "balayi-villacisi-logo.png",
      },
      {
        label: "Favicon",
        path: "/brands/balayi-villacisi/favicon.png",
        fileName: "balayi-villacisi-favicon.png",
      },
      {
        label: "OG Image",
        path: "/brands/balayi-villacisi/og-image.png",
        fileName: "balayi-villacisi-og-image.png",
      },
    ],
  },
  {
    key: "tatil-villacisi",
    label: "Tatil Villacısı",
    domain: "www.tatilvillacisi.com",
    assets: [
      {
        label: "Logo",
        path: "/brands/tatil-villacisi/logo.png",
        fileName: "tatil-villacisi-logo.png",
      },
      {
        label: "Favicon",
        path: "/brands/tatil-villacisi/favicon.png",
        fileName: "tatil-villacisi-favicon.png",
      },
      {
        label: "OG Image",
        path: "/brands/tatil-villacisi/og-image.png",
        fileName: "tatil-villacisi-og-image.png",
      },
    ],
  },
  {
    key: "glamping-turkey",
    label: "Glamping Turkey",
    domain: "www.glampingturkey.com",
    assets: [
      {
        label: "Logo (kare)",
        path: "/brands/glamping-turkey/logo.png",
        fileName: "glamping-turkey-logo.png",
      },
      {
        label: "Logo (yatay)",
        path: "/brands/glamping-turkey/logo-horizontal.png",
        fileName: "glamping-turkey-logo-horizontal.png",
      },
      {
        label: "Favicon",
        path: "/brands/glamping-turkey/favicon.png",
        fileName: "glamping-turkey-favicon.png",
      },
      {
        label: "OG Image",
        path: "/brands/glamping-turkey/og-image.png",
        fileName: "glamping-turkey-og-image.png",
      },
    ],
  },
];
