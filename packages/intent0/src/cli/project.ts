import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export interface Project {
  root: string;
  name: string;
  /**
   * next   = Next.js App Router: intent0 is added as a route + React component.
   * script = any other website (PHP, Express, Django, Spring, plain HTML, Next pages router…):
   *          intent0 runs as `intent0 serve` next to it and the site adds one <script> tag.
   */
  mode: "next" | "script";
  /** Next mode only: absolute path of app/ or src/app/. */
  appDir: string;
  /** Next mode only: src/components or components. */
  componentsDir: string;
  layoutFile?: string;
  typescript: boolean;
  /** tsconfig/jsconfig has the "@/*" path alias. */
  alias: boolean;
  /** Next mode: site components the bar can reuse, as import specifiers. */
  kit: { Button?: string; Input?: string; Textarea?: string };
  hasIntent0Dependency: boolean;
}

function firstExisting(...paths: string[]) {
  return paths.find((p) => existsSync(p));
}

/** Reads the project in `root`. Next.js App Router projects get the built-in integration; everything else uses the script tag. */
export function detectProject(root: string, opts: { script?: boolean } = {}): Project {
  const pkgPath = join(root, "package.json");
  const pkg = existsSync(pkgPath)
    ? (JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> })
    : {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const appDir = deps.next ? firstExisting(join(root, "src", "app"), join(root, "app")) : undefined;

  const base: Project = {
    root,
    name: pkg.name ?? basename(root),
    mode: "script",
    appDir: "",
    componentsDir: "",
    typescript: existsSync(join(root, "tsconfig.json")),
    alias: false,
    kit: {},
    hasIntent0Dependency: Boolean(deps.intent0),
  };
  if (!appDir || opts.script) return base;

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

  return { ...base, mode: "next", appDir, componentsDir, layoutFile, alias, kit };
}
