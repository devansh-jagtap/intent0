import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { objectKeys } from "./keys";
import type { Project } from "./project";

export interface RouteInfo {
  /** URL path. Dynamic segments stay in brackets, e.g. "/api/status/[id]". */
  path: string;
  methods: string[];
  inputs: string[];
  outputs: string[];
  checksSession: boolean;
  file: string;
  excerpt: string;
}

export interface FormInfo {
  /** Page URL where this form is shown, if it lives under app/. */
  page: string | null;
  file: string;
  fields: { name: string; label?: string; type?: string; options?: { value: string; label: string }[] }[];
  calls: string[];
}

export interface ScanResult {
  routes: RouteInfo[];
  forms: FormInfo[];
  /** Page URLs users open (dynamic segments in brackets), for choosing fallback pages. */
  pages?: string[];
  /**
   * Source of files the routes import (e.g. a forms/services config). Many sites define
   * their form fields, options and services as data there rather than in the pages.
   */
  supporting?: { file: string; content: string }[];
}

const CODE = /\.(tsx|ts|jsx|js)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "intent0", "dist", "build"]);

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (CODE.test(name)) out.push(full);
  }
  return out;
}

/** "src/app/(shop)/api/orders/route.ts" → "/api/orders". Route groups and private folders are dropped. */
function urlFor(appDir: string, file: string): string {
  const parts = relative(appDir, file).split(sep).slice(0, -1);
  const segs = parts.filter((p) => !(p.startsWith("(") && p.endsWith(")")) && !p.startsWith("_") && !p.startsWith("@"));
  return `/${segs.join("/")}`;
}

const uniq = (xs: string[]) => [...new Set(xs)].filter(Boolean);
const all = (re: RegExp, text: string, group = 1) => [...text.matchAll(re)].map((m) => m[group] ?? "");

function scanRoute(appDir: string, file: string): RouteInfo {
  const code = readFileSync(file, "utf8");
  const methods = uniq(all(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g, code));
  const inputs = uniq([
    ...all(/(\w+)\s*:\s*z\s*\.\s*\w+/g, code),
    ...all(/(?:body|data|json|payload|input)\.(\w+)/g, code),
    ...all(/searchParams\.get\(\s*["'`](\w+)["'`]/g, code),
    ...all(/formData\(\)[\s\S]{0,200}?\.get\(\s*["'`](\w+)["'`]/g, code),
    ...all(/\.get\(\s*["'`](\w+)["'`]\s*\)/g, code),
    ...all(/const\s*\{([^}]+)\}\s*=\s*(?:await\s+)?(?:body|data|json|req\.body|request\.json\(\)|await request\.json\(\))/g, code).flatMap(
      (s) => s.split(",").map((x) => x.split(":")[0]!.split("=")[0]!.replace("...", "").trim()),
    ),
  ]).filter((x) => /^\w+$/.test(x));
  const outputs = uniq(
    all(/\.json\(\s*\{([^}]*)\}/g, code).flatMap(objectKeys),
  ).filter((x) => !["error", "status", "message", "headers"].includes(x));
  const excerpt = code
    .split("\n")
    .filter((l) => !/^\s*import\s/.test(l))
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .slice(0, 1200);
  return {
    path: urlFor(appDir, file),
    methods,
    inputs,
    outputs,
    checksSession: /cookie|session|auth|currentUser|requireUser|getUser/i.test(code),
    file,
    excerpt,
  };
}

function scanForm(project: Project, file: string): FormInfo | null {
  const code = readFileSync(file, "utf8");
  if (!/<form\b|onSubmit|fetch\(|["'`]\/api\//.test(code)) return null;

  const labels = new Map<string, string>();
  for (const m of code.matchAll(/htmlFor=["'{]+["']?(\w+)["'}]*[^>]*>\s*([^<{]+?)\s*</g)) labels.set(m[1]!, m[2]!.trim());
  for (const m of code.matchAll(/label=["']([^"']+)["'][^>]*htmlFor=["'](\w+)["']/g)) labels.set(m[2]!, m[1]!);

  const fields: FormInfo["fields"] = [];
  for (const m of code.matchAll(/<(?:input|Input|textarea|Textarea|select)\b[^>]*\bname=["'](\w+)["'][^>]*>/g)) {
    const tag = m[0];
    const name = m[1]!;
    if (fields.some((f) => f.name === name)) continue;
    const type = /<(?:textarea|Textarea)/.test(tag) ? "textarea" : /<select/.test(tag) ? "select" : (/type=["'](\w+)["']/.exec(tag)?.[1] ?? "text");
    const field: FormInfo["fields"][number] = { name, type, label: labels.get(name) };
    if (type === "select") {
      const block = new RegExp(`<select\\b[^>]*name=["']${name}["'][\\s\\S]*?</select>`).exec(code)?.[0] ?? "";
      field.options = [...block.matchAll(/<option[^>]*value=["']([^"']+)["'][^>]*>\s*([^<]*)</g)].map((o) => ({ value: o[1]!, label: o[2]!.trim() || o[1]! }));
    }
    fields.push(field);
  }
  const calls = uniq(all(/["'`](\/api\/[^"'`?\s$]*)/g, code));
  if (fields.length === 0 && calls.length === 0) return null;

  const inApp = file.startsWith(project.appDir);
  return { page: inApp ? urlFor(project.appDir, file) : null, file: relative(project.root, file), fields, calls };
}

const IMPORT = /from\s+["']((?:@\/|\.{1,2}\/)[^"']+)["']/g;
const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"];

/** Resolves "@/lib/forms" or "../lib/forms" to a real file, if it exists. */
function resolveImport(project: Project, fromFile: string, spec: string): string | undefined {
  const srcRoot = dirname(project.appDir);
  const base = spec.startsWith("@/") ? join(srcRoot, spec.slice(2)) : resolve(dirname(fromFile), spec);
  return EXTS.map((e) => base + e).find((p) => existsSync(p) && statSync(p).isFile());
}

/**
 * Files the API routes import, two levels deep (route → http helper → forms config).
 * Files that look like data definitions (fields, options, labels) come first; total size is capped
 * (each task later gets only the slice of these files it needs).
 */
function supportingFiles(project: Project, routeFiles: string[]): { file: string; content: string }[] {
  const seen = new Set<string>();
  let frontier = routeFiles;
  for (let depth = 0; depth < 2; depth++) {
    const next: string[] = [];
    for (const f of frontier) {
      for (const m of readFileSync(f, "utf8").matchAll(IMPORT)) {
        const target = resolveImport(project, f, m[1]!);
        if (target && !seen.has(target) && !target.includes("node_modules") && !routeFiles.includes(target)) {
          seen.add(target);
          next.push(target);
        }
      }
    }
    frontier = next;
  }
  // Data definitions (fields, options…) and helpers that build the API's JSON replies
  // (e.g. a shared submit() returning { referenceId }) are what the model needs most.
  const score = (code: string) =>
    (code.match(/\b(fields?|options|label|required|placeholder|slug|endpoint)\b/g) ?? []).length +
    (/\b(?:Response|NextResponse|res)\.json\s*\(/.test(code) ? 10 : 0);
  const files = [...seen]
    .map((f) => {
      const code = readFileSync(f, "utf8")
        .split("\n")
        .filter((l) => !/^\s*(import\s|\/\/)/.test(l))
        .join("\n")
        .replace(/\n{2,}/g, "\n");
      return { file: relative(project.root, f).split(sep).join("/"), content: code, score: score(code) };
    })
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score);

  const out: { file: string; content: string }[] = [];
  let budget = 80_000;
  for (const f of files) {
    if (budget <= 500) break;
    const content = f.content.slice(0, Math.min(40_000, budget));
    budget -= content.length;
    out.push({ file: f.file, content });
  }
  return out;
}

/** Static scan: API routes (method, inputs, outputs), the forms that call them, pages, and data files they use. */
export function scanProject(project: Project): ScanResult {
  const appFiles = walk(project.appDir);
  const routeFiles = appFiles.filter((f) => /[\\/]route\.(ts|js)$/.test(f) && !f.includes(`${sep}intent0${sep}`));
  const routes = routeFiles.map((f) => scanRoute(project.appDir, f));
  const formFiles = [...appFiles.filter((f) => /\.(tsx|jsx)$/.test(f)), ...walk(project.componentsDir).filter((f) => !f.includes(`${sep}ui${sep}`))];
  const forms = uniq(formFiles)
    .map((f) => scanForm(project, f))
    .filter((f): f is FormInfo => f !== null);
  const pages = uniq(appFiles.filter((f) => /[\\/]page\.(tsx|jsx|ts|js)$/.test(f)).map((f) => urlFor(project.appDir, f)));
  return {
    routes: routes.filter((r) => r.methods.length > 0).map((r) => ({ ...r, file: relative(project.root, r.file) })),
    forms,
    pages,
    supporting: supportingFiles(project, routeFiles),
  };
}
