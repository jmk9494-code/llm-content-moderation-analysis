import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            // Allow scripts from self and Vercel analytics/insights (often used in Vercel deployments)
            // 'unsafe-inline' and 'unsafe-eval' might be needed for some libs (recharts sometimes uses eval/function construction)
            // Ideally we'd be stricter, but standard Next.js often requires 'unsafe-inline' for styles.
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' https://vitals.vercel-insights.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
