import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    const erp = (process.env.PUBLIC_ERP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
    return [
      { source: "/assets/payment-qr.jpeg", destination: `${erp}/assets/payment-qr.jpeg` },
      {
        source: "/api/:path*",
        destination: `${erp}/api/:path*`, // Proxy to Express backend
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
