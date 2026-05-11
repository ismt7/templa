import { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: "/templa",
        destination: "/",
      },
      {
        source: "/templa/:path*",
        destination: "/:path*",
      },
    ];
  },
};

export default nextConfig;
