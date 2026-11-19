import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@flowspace/shared'],
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
};

export default nextConfig;
