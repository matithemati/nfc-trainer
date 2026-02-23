// middleware.ts
// Middleware removed - authentication is now handled in page components
// which run on Node.js runtime and can safely use auth()
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // No-op middleware - all auth is handled in pages/API routes
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
