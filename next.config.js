/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.bunnycdn.com' },
      { protocol: 'https', hostname: '*.b-cdn.net' },
    ],
  },
}

module.exports = nextConfig
