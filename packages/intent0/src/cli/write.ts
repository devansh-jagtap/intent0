import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import type { Manifest, SiteMemory } from "@intent0/schema";
import type { Project } from "./project";

export const MANIFEST_FILE = "intent0.manifest.json";

const posix = (p: string) => p.split(sep).join("/");

export function manifestPath(project: Project) {
  return join(project.root, MANIFEST_FILE);
}

export function writeManifest(project: Project, manifest: Manifest) {
  writeFileSync(manifestPath(project), `${JSON.stringify(manifest, null, 2)}\n`);
}

/** app/intent0/[action]/route.ts: the server half, holding the model key. */
export const MEMORY_FILE = "intent0.memory.json";

export function memoryPath(project: Project) {
  return join(project.root, MEMORY_FILE);
}

export function writeMemory(project: Project, memory: SiteMemory) {
  writeFileSync(memoryPath(project), `${JSON.stringify(memory)}\n`);
}

/**
 * app/intent0/[action]/route.ts: the server half, holding the model key.
 * An older route written by intent0 (without Site Memory) is upgraded; a hand-made one is left alone.
 */
export function writeRoute(project: Project): string | null {
  const ext = project.typescript ? "ts" : "js";
  const file = join(project.appDir, "intent0", "[action]", `route.${ext}`);
  if (existsSync(file)) {
    const current = readFileSync(file, "utf8");
    if (!current.includes("Added by `intent0 init`") || current.includes(MEMORY_FILE)) return null;
  }
  const rel = (target: string) => {
    const r = posix(relative(dirname(file), target));
    return r.startsWith(".") ? r : `./${r}`;
  };
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    [
      "// Added by `intent0 init`. Serves the intent bar; the model key stays on this server.",
      'import { createNextRoute } from "intent0/server";',
      `import manifest from "${rel(manifestPath(project))}";`,
      `import memory from "${rel(memoryPath(project))}";`,
      "",
      "export const { GET, POST } = createNextRoute(manifest, memory);",
      "",
    ].join("\n"),
  );
  return file;
}

/** components/intent0-bar.tsx: the client layer, wired to the site's own components when found. */
export function writeBar(project: Project): string | null {
  const ext = project.typescript ? "tsx" : "jsx";
  const file = join(project.componentsDir, `intent0-bar.${ext}`);
  if (existsSync(file)) return null;
  const entries = Object.entries(project.kit) as [string, string][];
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    [
      '"use client";',
      "",
      "// Added by `intent0 init`. Passing your own components makes generated pages look like your site.",
      'import { Intent0Layer } from "intent0/react";',
      ...entries.map(([name, from]) => `import { ${name} } from "${from}";`),
      "",
      entries.length > 0 ? `const kit = { ${entries.map(([n]) => n).join(", ")} };` : "const kit = {};",
      "",
      "export function Intent0Bar() {",
      '  return <Intent0Layer endpoint="/intent0" kit={kit} />;',
      "}",
      "",
    ].join("\n"),
  );
  return file;
}

/** Adds <Intent0Bar /> right after <body ...> in the root layout. Returns false if it couldn't. */
export function patchLayout(project: Project): "patched" | "already" | "manual" {
  if (!project.layoutFile) return "manual";
  let code = readFileSync(project.layoutFile, "utf8");
  if (code.includes("Intent0Bar")) return "already";
  const body = /<body\b[^>]*>/.exec(code);
  if (!body) return "manual";

  const barFile = join(project.componentsDir, "intent0-bar");
  const spec = project.alias
    ? `@/${posix(relative(dirname(project.componentsDir), barFile))}`
    : (() => {
        const r = posix(relative(dirname(project.layoutFile!), barFile));
        return r.startsWith(".") ? r : `./${r}`;
      })();
  const importLine = `import { Intent0Bar } from "${spec}";\n`;

  const insertAt = body.index + body[0].length;
  code = `${code.slice(0, insertAt)}\n        <Intent0Bar />${code.slice(insertAt)}`;
  const imports = [...code.matchAll(/^import[^\n]*\n/gm)];
  const lastImport = imports.at(-1);
  const at = lastImport ? lastImport.index! + lastImport[0].length : 0;
  code = `${code.slice(0, at)}${importLine}${code.slice(at)}`;
  writeFileSync(project.layoutFile, code);
  return "patched";
}

export function readEnv(project: Project): Record<string, string> {
  const file = join(project.root, ".env.local");
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

/** Adds or replaces LLM_* settings in .env.local. Other lines are left alone. */
export function writeEnv(project: Project, values: Record<string, string>) {
  const file = join(project.root, ".env.local");
  const lines = existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/) : [];
  for (const [key, value] of Object.entries(values)) {
    const i = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (i >= 0) lines[i] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  writeFileSync(file, `${lines.filter((l, i) => l !== "" || i < lines.length - 1).join("\n")}\n`);
}

/** Makes sure .env.local is git-ignored. Returns true if it had to add it. */
export function ensureEnvIgnored(project: Project): boolean {
  const file = join(project.root, ".gitignore");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  // Already covered by ".env*", ".env.*" or ".env.local".
  if (/^\/?\.env(\*|\.\*|\.local)\s*$/m.test(text)) return false;
  appendFileSync(file, `${text.endsWith("\n") || text === "" ? "" : "\n"}# intent0: model key\n.env.local\n`);
  return true;
}
