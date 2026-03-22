import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Docker 최적화 빌드
  async headers() {
    return [
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
        ],
      },
    ];
  },
};

export default nextConfig;
