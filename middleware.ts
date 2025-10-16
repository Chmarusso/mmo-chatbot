import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const PUBLIC_PATHS = ["/", "/auth/callback", "/auth/login", "/games", "/privacy-policy", "/terms-of-use"];

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // Skip middleware for API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!hasSession && !isPublic) {
    const redirectUrl = req.nextUrl.clone();
    const target = `${pathname}${req.nextUrl.search}`;
    redirectUrl.pathname = "/auth/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("redirect", target || "/dashboard");
    return NextResponse.redirect(redirectUrl);
  }

  if (hasSession && pathname === "/") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.searchParams.delete("redirect");
    return NextResponse.redirect(redirectUrl);
  }

  if (hasSession && pathname === "/auth/login") {
    const fallbackPath = "/dashboard";
    const redirectParam = req.nextUrl.searchParams.get("redirect");
    let targetPath = fallbackPath;
    let targetSearch = "";

    if (redirectParam && redirectParam.startsWith("/")) {
      try {
        const parsed = new URL(redirectParam, req.nextUrl.origin);
        targetPath = parsed.pathname === "/" ? fallbackPath : parsed.pathname;
        targetSearch = parsed.search;
      } catch {
        targetPath = fallbackPath;
        targetSearch = "";
      }
    }

    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = targetPath;
    redirectUrl.search = targetSearch;
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)).*)",
  ],
};
