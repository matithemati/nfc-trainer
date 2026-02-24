// app/api/auth/error/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error") || "AccessDenied";
  
  // Redirect to signin page with error parameter
  // Default to Polish, but could be improved to detect user's preferred language
  const lang = "pl";
  const signinUrl = new URL(`/${lang}/auth/signin`, request.url);
  signinUrl.searchParams.set("error", error);
  
  return NextResponse.redirect(signinUrl);
}
