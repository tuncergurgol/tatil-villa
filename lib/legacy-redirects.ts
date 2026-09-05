/**
 * Eski / kırık public URL → yeni kalıcı (301) yönlendirmeler.
 * next.config.ts `redirects()` içine yayılır.
 */
export type LegacyRedirect = {
  source: string;
  destination: string;
  permanent?: boolean;
};

export const LEGACY_PUBLIC_REDIRECTS: LegacyRedirect[] = [
  // Eski villa listesi yolu
  { source: "/villalar/:slug", destination: "/:slug", permanent: true },
  {
    source: "/:locale(en|de|fr|es|bg|el|zh)/villalar/:slug",
    destination: "/:locale/:slug",
    permanent: true,
  },

  // Eski hizmet / bilet yolları
  { source: "/ucak-otobus", destination: "/bilet/ara", permanent: true },
  { source: "/ucak-otobus/:path*", destination: "/bilet/ara", permanent: true },
  { source: "/bilet", destination: "/bilet/ara", permanent: true },
  { source: "/transfer", destination: "/vip-transfer", permanent: true },
  { source: "/viptransfer", destination: "/vip-transfer", permanent: true },
  { source: "/ferry", destination: "/feribot", permanent: true },
  { source: "/feribotlar", destination: "/feribot", permanent: true },

  // Eski tur / aktivite
  { source: "/turlar", destination: "/tur/liste", permanent: true },
  { source: "/aktiviteler", destination: "/tur/liste", permanent: true },
  { source: "/gunubirlik", destination: "/tur/liste", permanent: true },

  // Eski üye / iletişim
  { source: "/login", destination: "/uye", permanent: true },
  { source: "/giris", destination: "/uye", permanent: true },
  { source: "/uye-girisi", destination: "/uye", permanent: true },
  { source: "/iletisim-formu", destination: "/kurumsal/iletisim", permanent: true },
  { source: "/contact", destination: "/kurumsal/iletisim", permanent: true },

  // Eski CMS / kurumsal slug varyasyonları
  { source: "/hakkimizda", destination: "/kurumsal/hakkimizda", permanent: true },
  { source: "/about", destination: "/kurumsal/hakkimizda", permanent: true },
  { source: "/gizlilik", destination: "/kurumsal/gizlilik-politikasi", permanent: true },
  { source: "/privacy", destination: "/kurumsal/gizlilik-politikasi", permanent: true },
  { source: "/kvkk", destination: "/kurumsal/kvkk", permanent: true },

  // Eski blog yolu
  { source: "/bloglar", destination: "/blog", permanent: true },
  { source: "/yazilar", destination: "/blog", permanent: true },
];
