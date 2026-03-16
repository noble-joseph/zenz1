import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  outputFileTracingExcludes: {
    "**/*": [
      "./node_modules/onnxruntime-node/**/*",
      "./node_modules/@img/sharp-libvips-*/**/*" // optional but helps
    ],
  },
  outputFileTracingIncludes: {
    "/api/**/*": ["./bin/**/*"],
  },
  serverExternalPackages: ["sharp", "onnxruntime-node"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "onnxruntime-node$": false,
      };
    }
    return config;
  },
};

export default nextConfig;
