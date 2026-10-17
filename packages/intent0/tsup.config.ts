import { defineConfig } from "tsup";

// Bundles the internal workspace packages into one installable package.
// Only zod and react stay external (installed by the site).
const shared = {
  format: ["esm" as const],
  target: "es2022",
  outDir: "dist",
  noExternal: [/^@intent0\//],
  external: ["react", "react/jsx-runtime", "zod"],
  sourcemap: false,
};

export default defineConfig([
  { ...shared, entry: { server: "src/server.ts" }, platform: "node", dts: { resolve: [/^@intent0\//] }, clean: true },
  // "use client" must stay at the very top for Next.js to treat the layer as a client component.
  { ...shared, entry: { react: "src/react.ts" }, platform: "browser", dts: { resolve: [/^@intent0\//] }, banner: { js: '"use client";' } },
  { ...shared, entry: { cli: "src/cli/index.ts" }, platform: "node", banner: { js: "#!/usr/bin/env node" } },
]);
