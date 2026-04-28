/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [],
  },
  transpilePackages: ["@react-three/fiber", "@react-three/drei", "three"],
}

export default nextConfig
