import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@broadcast/ui', '@broadcast/auth', '@broadcast/types', '@broadcast/config'],
};

export default nextConfig;
