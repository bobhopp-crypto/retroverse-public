import { NextResponse, type NextRequest } from "next/server";

import { isOpsEnabled, opsGateCookieValue } from "@/lib/ops/ops-gate";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

function blockLocalOnlyRoute(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.redirect(new URL("/", request.url));
}

function isFactoryHomepagePreviewPath(pathname: string): boolean {
  return /^\/bobos\/browser-plus\/preview\/RVTR\d{6}\/?$/i.test(pathname);
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const { pathname } = request.nextUrl;

  if (isFactoryHomepagePreviewPath(pathname)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-factory-homepage-preview", "1");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (
    pathname === "/ops/song-requests" ||
    pathname === "/bobos/song-requests" ||
    pathname.startsWith("/bobos/song-requests/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/bobos/jukebox";
    return NextResponse.redirect(url);
  }

  if (
    pathname === "/bobos/jukebox" ||
    pathname.startsWith("/bobos/jukebox/") ||
    pathname === "/api/ops/jukebox" ||
    pathname.startsWith("/api/ops/jukebox/")
  ) {
    if (!shouldAllowOpsRoutes(host)) return blockLocalOnlyRoute(request);
    if (!isOpsEnabled(host)) return new NextResponse("Not found", { status: 404 });
    if (opsGateCookieValue(request)) return NextResponse.next();
    if (pathname.startsWith("/api/")) return new NextResponse("Unauthorized", { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/internal/ops-pin";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (pathname === "/bobos/media-lab" || pathname.startsWith("/bobos/media-lab/")) {
    if (!shouldAllowOpsRoutes(host)) return blockLocalOnlyRoute(request);
    if (!isOpsEnabled(host)) return new NextResponse("Not found", { status: 404 });
    if (opsGateCookieValue(request)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/internal/ops-pin";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (
    pathname === "/local" ||
    pathname.startsWith("/local/") ||
    pathname === "/credentials" ||
    pathname.startsWith("/credentials/") ||
    pathname === "/bobos" ||
    pathname.startsWith("/bobos/") ||
    pathname.startsWith("/api/bobos/") ||
    pathname.startsWith("/api/ops/content-creator/library/files/") ||
    pathname.startsWith("/api/ops/bobos/broadcast-collections/")
  ) {
    if (!shouldAllowOpsRoutes(host)) {
      return blockLocalOnlyRoute(request);
    }
    return NextResponse.next();
  }

  if (!shouldAllowOpsRoutes(host)) {
    return blockLocalOnlyRoute(request);
  }

  if (!isOpsEnabled(host)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (
    pathname === "/internal/ops-pin" ||
    pathname === "/api/internal/ops-auth" ||
    pathname.startsWith("/api/ops/")
  ) {
    if (pathname.startsWith("/api/ops/") && !opsGateCookieValue(request)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return NextResponse.next();
  }

  if (opsGateCookieValue(request)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/internal/ops-pin";
  const back = `${pathname}${request.nextUrl.search}`;
  url.searchParams.set("next", back);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/local",
    "/local/:path*",
    "/credentials",
    "/credentials/:path*",
    "/bobos",
    "/bobos/:path*",
    "/ops",
    "/ops/:path*",
    "/diagnostics",
    "/diagnostics/:path*",
    "/internal/ops-pin",
    "/api/internal/ops-auth",
    "/api/ops/:path*",
    "/api/bobos/:path*",
  ],
};
