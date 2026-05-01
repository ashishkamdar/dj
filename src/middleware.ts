import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets — pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.json" ||
    pathname === "/logo.svg" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icon-")
  ) {
    return NextResponse.next();
  }

  // Super-admin routes — check super-admin session
  if (pathname.startsWith("/super-admin")) {
    if (pathname === "/super-admin/login") {
      return NextResponse.next();
    }
    const superSession = request.cookies.get("kp-super-session");
    if (!superSession?.value) {
      return NextResponse.redirect(
        new URL("/super-admin/login", request.url),
      );
    }
    return NextResponse.next();
  }

  // Signup page — public
  if (pathname === "/signup") {
    return NextResponse.next();
  }

  // Login page — public
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // All other routes — require tenant session
  const session = request.cookies.get("kp-session");
  if (!session?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
