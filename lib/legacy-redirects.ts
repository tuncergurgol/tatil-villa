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
  { source: "/tur/list", destination: "/tur/liste", permanent: true },

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
  { source: "/kvkk", destination: "/kurumsal/gizlilik-politikasi", permanent: true },
  {
    source: "/kurumsal/kvkk",
    destination: "/kurumsal/gizlilik-politikasi",
    permanent: true,
  },
  {
    source: "/kurumsal/elektronik-ilet-ve-acik-riza-metni",
    destination: "/kurumsal/gizlilik-politikasi",
    permanent: true,
  },

  // Eski blog yolu
  { source: "/bloglar", destination: "/blog", permanent: true },
  { source: "/yazilar", destination: "/blog", permanent: true },
];

/**
 * Eski /tesis/... CRM yolları → güncel public path.
 * Dil öneki temizlenmiş pathname bekler.
 */
export function legacyTesisRedirectDestination(
  pathname: string
): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/tesis") return "/villalar";
  if (!path.startsWith("/tesis/")) return null;
  const detay = path.match(/^\/tesis\/detay\/([^/]+)$/);
  if (detay?.[1]) return `/${detay[1]}`;
  return "/villalar";
}

/**
 * Eski CRM / silinmiş villa dışı kırık yollar (GSC 404).
 * Dil öneki temizlenmiş pathname bekler.
 */
export function legacyBrokenPublicPathDestination(
  pathname: string
): string | null {
  const tesis = legacyTesisRedirectDestination(pathname);
  if (tesis) return tesis;

  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/iletisim") return "/kurumsal/iletisim";
  if (
    path === "/merak-ettikleriniz" ||
    path === "/sss" ||
    path === "/faq"
  ) {
    return "/sik-sorulan-sorular";
  }
  if (path === "/home" || path.startsWith("/home/")) return "/";
  if (path === "/kiralik-villa" || path === "/kiralik-villalar") {
    return "/villalar";
  }

  if (
    path === "/zpara-kazandiran-oteller" ||
    path === "/erken-rezervasyon-otelleri" ||
    path === "/saatlik-oda" ||
    path.startsWith("/otel/")
  ) {
    return "/otel";
  }

  if (
    path === "/arac-kiralama/liste" ||
    path.startsWith("/arac-kiralama/liste/") ||
    path === "/arac-kiralama/home" ||
    path === "/arac-kiralama/detay" ||
    path.startsWith("/arac-kiralama/detay/")
  ) {
    return "/arac-kiralama";
  }

  if (path === "/destinasyonlar" || path.startsWith("/destinasyonlar/")) {
    const slug = path.split("/")[2]?.trim().toLowerCase() || "";
    if (slug && slug !== "home" && /^[a-z0-9-]+$/.test(slug)) {
      return `/villalar?region=${encodeURIComponent(slug)}`;
    }
    return "/villalar";
  }

  const blogDetail = path.match(/^\/blog\/detay\/([^/]+)$/);
  if (blogDetail?.[1]) return `/blog/${blogDetail[1]}`;

  if (path === "/rehber" || path.startsWith("/rehber/")) {
    return path.includes("transfer") ? "/vip-transfer" : "/blog";
  }

  if (path === "/rota" || path.startsWith("/rota/")) return "/tur/liste";
  if (path.startsWith("/transfer/")) return "/vip-transfer";
  if (path === "/tur/home" || path === "/tur/detay") return "/tur/liste";
  if (path === "/bilet/home") return "/bilet/ara";
  if (path === "/tekne" || path.startsWith("/tekne/")) return "/tur/liste";

  const corporateRoot: Record<string, string> = {
    "/banka-bilgilerimiz": "/kurumsal/banka-bilgilerimiz",
    "/gizlilik-politikasi": "/kurumsal/gizlilik-politikasi",
    "/iptal-ve-iade-kosullari": "/kurumsal/iptal-ve-iade-kosullari",
    "/online-rezervasyon-sozlesmesi": "/kurumsal/online-rezervasyon-sozlesmesi",
    "/kiralama-kosullari": "/kurumsal/iptal-ve-iade-kosullari",
    "/mesafeli-satis-sozlesmesi": "/kurumsal/gizlilik-politikasi",
  };
  if (corporateRoot[path]) return corporateRoot[path];

  const rentalLanding = path.match(
    /^\/([a-z0-9-]+)-villa-kiralama(?:\/([a-z0-9-]+))?$/i
  );
  if (rentalLanding) {
    const region = (rentalLanding[2] || rentalLanding[1] || "")
      .trim()
      .toLowerCase();
    if (region && region !== "home") {
      return `/villalar?region=${encodeURIComponent(region)}`;
    }
    return "/villalar";
  }

  return null;
}
