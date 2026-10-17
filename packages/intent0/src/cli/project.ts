import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Project {
  root: string;
  name: string;
  /** Absolute path of the Next.js app directory (app/ or src/app/). */
  appDir: string;
  /** Where components live: src/components or components. */
  componentsDir: string;
  layoutFile?: string;
  typescript: boolean;
  /** tsconfig/jsconfig has the "@/*" path alias. */
  alias: boolean;
  /** Site components the bar can reuse, as import specifiers. */
  kit: { Button?: string; Input?: string; Textarea?: string };
  hasIntent0Dependency: boolean;
}

function firstExisting(...paths: string[]) {
  return paths.find((p) => existsSync(p));
}

/** Reads the project in `root`. Throws a readable error if it isn't a Next.js App Router project. */
export function detectProject(root: string): Project {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) throw new Error("No package.json here. Run this inside your website's project folder.");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps.next) throw new Error("This version of intent0 supports Next.js (App Router) projects only. No 'next' dependency found.");

  const appDir = firstExisting(join(root, "src", "app"), join(root, "app"));
  if (!appDir) throw new Error("No app/ or src/app/ folder found. intent0 needs the Next.js App Router.");

  const srcRoot = appDir.endsWith(join("src", "app")) ? join(root, "src") : root;
  const componentsDir = join(srcRoot, "components");
  const layoutFile = firstExisting(...["tsx", "jsx", "ts", "js"].map((ext) => join(appDir, `layout.${ext}`)));
  const tsconfig = firstExisting(join(root, "tsconfig.json"), join(root, "jsconfig.json"));
  const alias = tsconfig ? /"@\/\*"/.test(readFileSync(tsconfig, "utf8")) : false;

  const kit: Project["kit"] = {};
  for (const [name, file] of [
    ["Button", "button"],
    ["Input", "input"],
    ["Textarea", "textarea"],
  ] as const) {
    const path = firstExisting(...["tsx", "jsx"].map((ext) => join(componentsDir, "ui", `${file}.${ext}`)));
    if (path && alias && new RegExp(`export[^;]*\\b${name}\\b`).test(readFileSync(path, "utf8"))) {
      kit[name] = `@/components/ui/${file}`;
    }
  }

  return {
    root,
    name: pkg.name ?? "website",
    appDir,
    componentsDir,
    layoutFile,
    typescript: existsSync(join(root, "tsconfig.json")),
    alias,
    kit,
    hasIntent0Dependency: Boolean(deps.intent0),
  };
}
