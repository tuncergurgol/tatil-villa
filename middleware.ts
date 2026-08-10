import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";
import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";
import { stripDefaultLocalePrefix } from "@/lib/i18n/path";

const { auth } = NextAuth(authConfig);
const handleI18nRouting = createIntlMiddleware(routing);

const FOREIGN_LOCALE_PREFIX = /^\/(en|de|fr|es|bg|el|zh)(\/|$)/;

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

function getRequestHostname(req: NextRequest): string {
  return getHostname(
    req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      req.nextUrl.host
  );
}

function isAdminHostAllowed(host: string): boolean {
  const hostname = getHostname(host);
  if (isLocalDevHost(hostname)) return true;
  return getAdminHosts().includes(hostname);
}

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

function rewriteDefaultLocalePath(req: NextRequest, pathname: string) {
  const rewriteUrl = req.nextUrl.clone();
  rewriteUrl.pathname =
    pathname === "/"
      ? `/${routing.defaultLocale}`
      : `/${routing.defaultLocale}${pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

function redirectStripTurkishPrefix(req: NextRequest, pathname: string) {
  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = stripDefaultLocalePrefix(pathname);
  redirectUrl.hostname = sanitizePublicBookingDomain(getRequestHostname(req));
  redirectUrl.protocol = "https:";
  redirectUrl.port = "";
  return NextResponse.redirect(redirectUrl, 301);
}

function normalizePublicRedirectLocation(
  req: NextRequest,
  location: string
): string {
  const target = new URL(location, req.nextUrl);
  target.hostname = sanitizePublicBookingDomain(getRequestHostname(req));
  target.protocol = "https:";
  target.port = "";
  target.pathname = stripDefaultLocalePrefix(target.pathname);
  return target.toString();
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const host = req.headers.get("host") || req.nextUrl.host;

  if (isDedicatedAdminHost(host) && !isAdminOnlyPath(pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = sanitizePublicBookingDomain(host);
    redirectUrl.port = "";
    return NextResponse.redirect(redirectUrl, 301);
  }

  if (!isAdminOnlyPath(pathname)) {
    if (pathname === "/tr" || pathname.startsWith("/tr/")) {
      return redirectStripTurkishPrefix(req, pathname);
    }

    if (!FOREIGN_LOCALE_PREFIX.test(pathname)) {
      return rewriteDefaultLocalePath(req, pathname);
    }

    const intlResponse = handleI18nRouting(req as NextRequest);
    if (intlResponse.status >= 300 && intlResponse.status < 400) {
      const location = intlResponse.headers.get("location");
      if (location) {
        const fixed = normalizePublicRedirectLocation(req, location);
        if (fixed !== location) {
          return NextResponse.redirect(
            fixed,
            intlResponse.status as 301 | 302 | 307 | 308
          );
        }
      }
    }
    return intlResponse;
  }

  const isLoggedIn = !!req.auth;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginArea = pathname.startsWith("/admin/login");

  if (isAdminRoute && !isAdminHostAllowed(host)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isAdminRoute && !isLoginArea && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }

  if (isLoginArea && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/(en|de|fr|es|bg|el|zh)/:path*",
    "/((?!api|admin|feeds|_next|_vercel|.*\\..*).*)",
    "/admin/:path*",
  ],
};
