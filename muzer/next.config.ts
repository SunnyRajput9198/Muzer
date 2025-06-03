// next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'example.com',
      },
      {
        protocol: 'https',
        hostname: 'another-cdn.com',
      },
      {
        protocol: 'https',
        hostname: 'third-party-image-provider.net',
      },
      // Add patterns for other domains or subdomains as needed
    ],
  },
  // Clean ESLint configuration
  eslint: {
    // 'ignoreDuringBuilds: false' means ESLint errors will break the build (recommended for production).
    // Set to 'true' to allow builds to complete even with ESLint errors (useful for debugging, not recommended for final production).
    ignoreDuringBuilds: false,
  },
  // You can add other Next.js configurations here
  // For example: output: 'standalone', experimental: { appDir: true } etc.
};

export default nextConfig;