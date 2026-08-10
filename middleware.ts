import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";
import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";

const { auth } = NextAuth(authConfig);
const handleI18nRouting = createIntlMiddleware(routing);

function getAdminHosts(): string[] {
  return (process.env.ADMIN_HOST || "bont.tatildeyiz.com.tr")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function isLocalDevHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  );
}

function getHostname(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

function isAdminHostAllowed(host: string): boolean {
  const hostname = getHostname(host);
  if (isLocalDevHost(hostname)) return true;
  return getAdminHosts().includes(hostname);
}

/** bont.* gibi yalnızca admin için ayrılmış hostlar (localhost hariç). */
function isDedicatedAdminHost(host: string): boolean {
  const hostname = getHostname(host);
  if (isLocalDevHost(hostname)) return false;
  return getAdminHosts().includes(hostname);
}

function isAdminOnlyPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/feeds") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/uploads") ||
    /\.[^/]+$/.test(pathname)
  );
}

function shouldSkipLocaleRouting(pathname: string) {
  return isAdminOnlyPath(pathname);
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const host = req.headers.get("host") || req.nextUrl.host;
  const isLoggedIn = !!req.auth;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginArea = pathname.startsWith("/admin/login");

  // Admin host (bont.*) yalnizca panel/API; musteri sitesi www'ye yonlendirilir
  if (isDedicatedAdminHost(host) && !isAdminOnlyPath(pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = sanitizePublicBookingDomain(host);
    redirectUrl.port = "";
    return NextResponse.redirect(redirectUrl, 301);
  }

  if (isAdminRoute && !isAdminHostAllowed(host)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isAdminRoute && !isLoginArea && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }

  if (isLoginArea && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }

  if (shouldSkipLocaleRouting(pathname)) {
    return NextResponse.next();
  }

  return handleI18nRouting(req as NextRequest);
});

export const config = {
  matcher: [
    "/",
    "/(tr|en|de|fr|es|bg|el|zh)/:path*",
    "/((?!api|admin|feeds|_next|_vercel|.*\\..*).*)",
    "/admin/:path*",
  ],
};
