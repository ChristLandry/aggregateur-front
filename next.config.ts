import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["expr-eval"],
  experimental: {
    typedRoutes: false,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "/api-proxy/api/:path*",
      },
      {
        source: "/health",
        destination: "/api-proxy/health",
      },
      {
        source: "/metrics",
        destination: "/api-proxy/metrics",
      },
    ];
  },
};

export default nextConfig;
