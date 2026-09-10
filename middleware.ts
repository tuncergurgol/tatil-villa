import { NextResponse, NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "@/i18n/routing";
import {
  isNonPublicBookingHost,
  normalizeRequestHostHeader,
  resolveMiddlewarePublicHostname,
  sanitizePublicBookingDomain,
} from "@/lib/i18n/middleware-host";
import { getAuthSecret, useSecureAuthCookies } from "@/lib/auth-secret";
import { stripDefaultLocalePrefix } from "@/lib/i18n/path";
import {
  isForeignLocalePath,
  shouldNoindexPublicUrl,
} from "@/lib/public-indexing";
import { LEGACY_PUBLIC_REDIRECTS } from "@/lib/legacy-redirects";

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

function getRequestHostname(req: NextRequest): string {
  return normalizeRequestHostHeader(
    req.headers.get("host") ??
      req.headers.get("x-forwarded-host") ??
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

function withPublicIndexingHeaders(req: NextRequest, res: NextResponse) {
  if (shouldNoindexPublicUrl(req.nextUrl.pathname, req.nextUrl.searchParams)) {
    res.headers.set("X-Robots-Tag", "noindex, follow");
  }
  return res;
}

function publicPathRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers(req.headers);
  headers.set(
    "x-public-pathname",
    stripDefaultLocalePrefix(req.nextUrl.pathname) || "/"
  );
  headers.set("x-public-search", req.nextUrl.searchParams.toString());
  return headers;
}

function exactLegacyRedirectDestination(pathname: string): string | null {
  const path = stripDefaultLocalePrefix(pathname) || "/";
  const match = LEGACY_PUBLIC_REDIRECTS.find(
    (item) => !item.source.includes(":") && item.source === path
  );
  return match?.destination ?? null;
}

function redirectLegacyPublicPath(req: NextRequest): NextResponse | null {
  const destination = exactLegacyRedirectDestination(req.nextUrl.pathname);
  if (!destination || destination === stripDefaultLocalePrefix(req.nextUrl.pathname)) {
    return null;
  }
  const url = req.nextUrl.clone();
  url.pathname = destination;
  applyPublicRedirectHost(req, url);
  return NextResponse.redirect(url, 301);
}

function rewriteDefaultLocalePath(req: NextRequest, pathname: string) {
  const rewriteUrl = req.nextUrl.clone();
  rewriteUrl.pathname =
    pathname === "/"
      ? `/${routing.defaultLocale}`
      : `/${routing.defaultLocale}${pathname}`;
  return withPublicIndexingHeaders(
    req,
    NextResponse.rewrite(rewriteUrl, {
      request: { headers: publicPathRequestHeaders(req) },
    })
  );
}

function resolvePublicHostForRequest(req: NextRequest): string {
  const requestHost = getRequestHostname(req);
  if (requestHost && !isNonPublicBookingHost(requestHost)) {
    return requestHost;
  }
  return resolveMiddlewarePublicHostname(
    req.headers.get("host"),
    req.headers.get("x-forwarded-host"),
    req.nextUrl.host
  );
}

function applyPublicRedirectHost(req: NextRequest, url: URL) {
  url.hostname = resolvePublicHostForRequest(req);
  url.protocol = "https:";
  url.port = "";
}

function redirectStripTurkishPrefix(req: NextRequest, pathname: string) {
  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = stripDefaultLocalePrefix(pathname);
  applyPublicRedirectHost(req, redirectUrl);
  return NextResponse.redirect(redirectUrl, 301);
}

function normalizePublicRedirectLocation(
  req: NextRequest,
  location: string
): string {
  const target = new URL(location, req.nextUrl);
  const publicHost = resolvePublicHostForRequest(req);
  if (target.hostname !== publicHost) {
    target.hostname = publicHost;
  }
  target.protocol = "https:";
  target.port = "";
  target.pathname = stripDefaultLocalePrefix(target.pathname);
  return target.toString();
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const host = req.headers.get("host") || req.nextUrl.host;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

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

    const legacyRedirect = redirectLegacyPublicPath(req);
    if (legacyRedirect) return legacyRedirect;

    if (!isForeignLocalePath(pathname)) {
      return rewriteDefaultLocalePath(req, pathname);
    }

    const intlResponse = handleI18nRouting(
      new NextRequest(req, { headers: publicPathRequestHeaders(req) })
    );
    if (intlResponse.status >= 300 && intlResponse.status < 400) {
      const location = intlResponse.headers.get("location");
      if (location) {
        const fixed = normalizePublicRedirectLocation(req, location);
        if (fixed !== location) {
          return withPublicIndexingHeaders(
            req,
            NextResponse.redirect(
              fixed,
              intlResponse.status as 301 | 302 | 307 | 308
            )
          );
        }
      }
    }
    return withPublicIndexingHeaders(req, intlResponse);
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginArea = pathname.startsWith("/admin/login");
  const token = await getToken({
    req,
    secret: getAuthSecret(),
    secureCookie: useSecureAuthCookies(),
  });
  const isLoggedIn = !!token;

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
}

export const config = {
  matcher: [
    "/",
    "/(en|de|fr|es|bg|el|zh)/:path*",
    "/((?!api|admin|feeds|_next|_vercel|.*\\..*).*)",
    "/admin/:path*",
  ],
};
