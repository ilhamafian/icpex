import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "icpex_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Legacy /admin → /portal
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const target = pathname.replace(/^\/admin/, "/portal") || "/portal";
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (pathname.startsWith("/portal") && pathname !== "/portal/login") {
    if (!hasSession) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
  }

  if (pathname === "/portal/login" && hasSession) {
    // Role-specific home is resolved in the login page / shell
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal", "/portal/:path*", "/admin", "/admin/:path*"],
};
