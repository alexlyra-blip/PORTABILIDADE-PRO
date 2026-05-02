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
        destination: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/uploads/:path*` : 'http://127.0.0.1:8000/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
