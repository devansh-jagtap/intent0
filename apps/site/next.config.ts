import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // intent0 packages ship TypeScript source in this monorepo ("Ask this site" runs on intent0 itself).
  transpilePackages: ["@intent0/core", "@intent0/schema", "@intent0/adapter", "@intent0/react"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/media/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
