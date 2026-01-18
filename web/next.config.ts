import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['img.logo.dev'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.logo.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Headers are now handled by middleware.ts for better security control.
};

export default nextConfig;
