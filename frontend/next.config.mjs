/** @type {import('next').NextConfig} */
const isDevWindows = process.platform === 'win32';
const isProduction = process.env.NODE_ENV === 'production';

const BACKEND_URL = isProduction
  ? 'http://simulador_portabilidadepro-backend:8000'
  : (
      process.env.BACKEND_URL ||
      (
        isDevWindows
          ? 'http://127.0.0.1:8000'
          : 'http://127.0.0.1:8000'
      )
    );

console.log(
  `[NextConfig] Using Backend URL: ${BACKEND_URL}`
);

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
    workerThreads: false,
    memoryBasedWorkersCount: true
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
