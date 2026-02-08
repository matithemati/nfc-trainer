// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return;
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (first === "pl" || first === "en") {
    return;
  }

  const url = req.nextUrl.clone();
  url.pathname = `/pl${pathname}`;
  return NextResponse.redirect(url);
}
