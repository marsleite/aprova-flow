import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@aprovamind/domain",
    "@aprovamind/application",
    "@aprovamind/contracts",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
