/** @type {import('next').NextConfig} */
const isDevWindows =
  process.platform === 'win32';

/* MULTIPLA_WINDOWS_BACKEND_V3 */
const configuredBackendUrl =
  (process.env.BACKEND_URL || '').trim();

const localBackendUrl =
  (
    process.env.LOCAL_BACKEND_URL ||
    'http://127.0.0.1:8000'
  ).trim();

const productionBackendUrl =
  configuredBackendUrl ||
  'http://simulador_portabilidadepro-backend:8000';

const BACKEND_URL =
  isDevWindows
    ? localBackendUrl
    : productionBackendUrl;

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
