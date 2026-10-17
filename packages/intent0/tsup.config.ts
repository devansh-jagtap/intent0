import { defineConfig } from "tsup";

// Bundles the internal workspace packages into one installable package.
// Only zod and react stay external for the npm entries (the site installs them).
const shared = {
  format: ["esm" as const],
  target: "es2022",
  outDir: "dist",
  noExternal: [/^@intent0\//],
  external: ["react", "react/jsx-runtime", "zod"],
  sourcemap: false,
};

export default defineConfig([
  { ...shared, entry: { server: "src/server.ts" }, platform: "node", dts: true },
  // "use client" must stay at the very top for Next.js to treat the layer as a client component.
  { ...shared, entry: { react: "src/react.ts" }, platform: "browser", dts: true, banner: { js: '"use client";' } },
  { ...shared, entry: { cli: "src/cli/index.ts" }, platform: "node", banner: { js: "#!/usr/bin/env node" } },
  // Script-tag build: everything (React included) in one file for any website.
  {
    entry: { intent0: "src/browser.tsx" },
    format: ["iife"],
    platform: "browser",
    target: "es2020",
    outDir: "dist",
    noExternal: [/.*/],
    minify: true,
    sourcemap: false,
    define: { "process.env.NODE_ENV": '"production"' },
    outExtension: () => ({ js: ".js" }),
    // Preact's React-compatible layer keeps the script small (React itself is ~200 KB).
    esbuildOptions(options) {
      options.alias = { react: 'preact/compat', 'react-dom/client': 'preact/compat/client', 'react-dom': 'preact/compat', 'react/jsx-runtime': 'preact/jsx-runtime' };
    },
  },
]);
