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
                destination: 'http://portabilidade-api:8000/api/:path*',
            },
            {
                source: '/uploads/:path*',
                destination: 'http://portabilidade-api:8000/uploads/:path*',
            },
        ];
    },
};

export default nextConfig;
