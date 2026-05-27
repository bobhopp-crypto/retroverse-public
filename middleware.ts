import { NextResponse, type NextRequest } from "next/server";

import { isOpsEnabled, opsGateCookieValue } from "@/lib/ops/ops-gate";

export function middleware(request: NextRequest) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { pathname } = request.nextUrl;

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
    "/ops",
    "/ops/:path*",
    "/internal/ops-pin",
    "/api/internal/ops-auth",
    "/api/ops/:path*",
  ],
};
