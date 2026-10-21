import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // intent0 packages ship TypeScript source in this monorepo.
  transpilePackages: ["@intent0/core", "@intent0/schema", "@intent0/adapter", "@intent0/react"],
};

export default nextConfig;
