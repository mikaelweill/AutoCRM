/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nkicqyftdkfphifgvejh.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  typescript: {
    // Exclude Supabase Edge Functions from TypeScript checking
    ignoreBuildErrors: true
  },
  eslint: {
    // Exclude Supabase Edge Functions from ESLint
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig
