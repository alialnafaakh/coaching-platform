import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Allow Stripe webhook to receive raw body
  serverExternalPackages: ["stripe"],
};

export default nextConfig;
