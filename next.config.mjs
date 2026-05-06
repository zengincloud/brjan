/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [],
  },
  transpilePackages: ["@react-three/fiber", "@react-three/drei", "three"],
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
}

export default nextConfig
