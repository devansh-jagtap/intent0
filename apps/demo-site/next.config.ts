import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // intent0 packages ship TypeScript source in this monorepo.
  transpilePackages: ["@intent0/core", "@intent0/schema", "@intent0/adapter", "@intent0/react"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
