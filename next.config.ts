import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      // Rewrite paths without language prefix to Polish (excluding API routes, Next.js internals, and static files)
      {
        source: "/:path((?!api|_next|pl|en|.*\\..*).*)",
        destination: "/pl/:path*",
      },
    ];
  },
};

export default nextConfig;
