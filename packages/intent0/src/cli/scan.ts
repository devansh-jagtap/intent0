import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Project } from "./project";

export interface RouteInfo {
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
    all(/\.json\(\s*\{([^}]*)\}/g, code).flatMap((body) => all(/(\w+)\s*(?::|,|$)/g, body)),
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

/** Static scan: API routes (method, inputs, outputs) and the forms that call them. */
export function scanProject(project: Project): ScanResult {
  const appFiles = walk(project.appDir);
  const routes = appFiles.filter((f) => /[\\/]route\.(ts|js)$/.test(f)).map((f) => scanRoute(project.appDir, f));
  const formFiles = [...appFiles.filter((f) => /\.(tsx|jsx)$/.test(f)), ...walk(project.componentsDir).filter((f) => !f.includes(`${sep}ui${sep}`))];
  const forms = uniq(formFiles)
    .map((f) => scanForm(project, f))
    .filter((f): f is FormInfo => f !== null);
  return {
    routes: routes.filter((r) => r.methods.length > 0 && !r.path.includes("[")).map((r) => ({ ...r, file: relative(project.root, r.file) })),
    forms,
  };
}
