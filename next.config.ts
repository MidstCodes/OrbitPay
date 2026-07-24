import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Enable React strict mode for development */
  reactStrictMode: true,

  /* Output configuration */
  output: 'standalone',

  /* Image configuration */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'stellar.org',
      },
    ],
  },

  /* Headers for security */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
