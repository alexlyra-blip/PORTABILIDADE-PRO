/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://simulador-portabilidade-api.qzznq7.easypanel.host/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'https://simulador-portabilidade-api.qzznq7.easypanel.host/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
