import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${(process.env.PUBLIC_ERP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "")}/api/:path*`, // Proxy to Express backend
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow external images from S3 or standard sources
      },
    ],
  },
};

export default nextConfig;
