/** @type {import('next').NextConfig} */
const isDevWindows = process.platform === 'win32';
const BACKEND_URL = process.env.BACKEND_URL || (isDevWindows ? 'http://127.0.0.1:8000' : 'http://portabilidade-api:8000');

console.log(`[NextConfig] Using Backend URL: ${BACKEND_URL}`);

const nextConfig = {
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
    workerThreads: false
  },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${BACKEND_URL}/api/:path*`,
            },
            {
                source: '/uploads/:path*',
                destination: `${BACKEND_URL}/uploads/:path*`,
            },
        ];
    },
};

export default nextConfig;
