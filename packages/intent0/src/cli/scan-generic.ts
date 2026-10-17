import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import type { Project } from "./project";
import type { FormInfo, RouteInfo, ScanResult } from "./scan";

/**
 * Language-agnostic scan for "script" mode: finds route declarations in common backends
 * (Express/Fastify/Koa, Laravel, plain PHP API files, Flask/FastAPI, Spring, ASP.NET, Go)
 * and forms in templates. It's a rough static read; the model and the human review fill gaps,
 * and flows that use a route not found here are dropped.
 */

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "target", "vendor", "venv", ".venv",
  "__pycache__", "bin", "obj", "coverage", ".turbo", "intent0",
]);
const BACKEND_EXT = new Set([".js", ".mjs", ".cjs", ".ts", ".php", ".py", ".java", ".kt", ".cs", ".go", ".rb"]);
const TEMPLATE_EXT = new Set([".html", ".htm", ".php", ".jsp", ".ejs", ".hbs", ".erb", ".twig", ".vue", ".jsx", ".tsx", ".cshtml", ".njk"]);
const MAX_FILE = 200_000;

function walk(dir: string, out: string[] = []): string[] {
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (st.size < MAX_FILE) out.push(full);
  }
  return out;
}

const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))];
const all = (re: RegExp, text: string, g = 1) => [...text.matchAll(re)].map((m) => m[g] ?? "");
/** Paths with parameters (:id, {id}, <id>, [id]) can't be called from a fixed manifest path yet. */
const hasParams = (p: string) => /[:{}<>[\]*]/.test(p);
const normPath = (p: string) => `/${p.replace(/^\/+/, "")}`.replace(/\/+$/, "") || "/";

interface Decl {
  method: string;
  path: string;
  index: number;
}

function declarations(code: string, file: string, root: string): Decl[] {
  const out: Decl[] = [];
  const push = (method: string, path: string, index: number) => out.push({ method: method.toUpperCase(), path: normPath(path), index });

  // Express / Fastify / Koa / Hono / Laravel / Gin / Echo / FastAPI-style calls
  for (const m of code.matchAll(/\b(?:app|router|server|api|route|r|e|Route)(?:\.|::)(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi))
    push(m[1]!, m[2]!, m.index!);
  // FastAPI / Flask decorators: @app.post("/x"), @bp.route("/x", methods=["POST"])
  for (const m of code.matchAll(/@\w+\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/gi)) push(m[1]!, m[2]!, m.index!);
  for (const m of code.matchAll(/@\w+\.route\(\s*["']([^"']+)["']([^)]*)\)/g)) {
    const methods = all(/["'](GET|POST|PUT|PATCH|DELETE)["']/gi, m[2] ?? "");
    for (const method of methods.length ? methods : ["GET"]) push(method, m[1]!, m.index!);
  }
  // Spring: @PostMapping("/x") / @GetMapping(value = "/x")
  for (const m of code.matchAll(/@(Get|Post|Put|Patch|Delete)Mapping\(\s*(?:value\s*=\s*|path\s*=\s*)?["']([^"']+)["']/g)) push(m[1]!, m[2]!, m.index!);
  // ASP.NET: [HttpPost("x")]
  for (const m of code.matchAll(/\[Http(Get|Post|Put|Patch|Delete)\(\s*"([^"]+)"\s*\)\]/g)) push(m[1]!, m[2]!, m.index!);
  // Go net/http: http.HandleFunc("/x", ...)
  for (const m of code.matchAll(/HandleFunc\(\s*"([^"]+)"/g)) push(/r\.Method\s*==\s*"POST"|MethodPost/.test(code) ? "POST" : "GET", m[1]!, m.index!);
  // Plain PHP endpoint files that answer with JSON: the file itself is the route.
  if (file.endsWith(".php") && /json_encode\s*\(/.test(code) && out.length === 0) {
    const method = /\$_POST|php:\/\/input/.test(code) ? "POST" : "GET";
    push(method, posixRel(root, file), 0);
  }
  return out.filter((d) => !hasParams(d.path));
}

const posixRel = (root: string, file: string) => relative(root, file).split(sep).join("/");

/** Inputs and outputs near a declaration, across languages. */
function ioNear(code: string, at: number) {
  const chunk = code.slice(at, at + 2500);
  const inputs = uniq([
    ...all(/(?:req|request|ctx\.request)\.(?:body|query)\.(\w+)/g, chunk),
    ...all(/const\s*\{([^}]+)\}\s*=\s*(?:await\s+)?(?:req\.body|req\.query|request\.body|await request\.json\(\)|body)/g, chunk).flatMap((s) =>
      s.split(",").map((x) => x.split(":")[0]!.split("=")[0]!.trim()),
    ),
    ...all(/\$_(?:POST|GET|REQUEST)\[\s*['"](\w+)['"]\s*\]/g, chunk),
    ...all(/\$(?:request|data|input)\s*(?:->|\[)\s*['"]?(\w+)/g, chunk),
    ...all(/request\.(?:json|form|args|data)(?:\.get\(\s*|\[\s*)["'](\w+)["']/g, chunk),
    ...all(/@Request(?:Param|Body)[^)]*\)\s*\w+\s+(\w+)/g, chunk),
    ...all(/(\w+)\s*:\s*z\.\w+/g, chunk),
    ...all(/body\.(\w+)/g, chunk),
  ]).filter((x) => /^\w+$/.test(x));
  const outputs = uniq([
    ...all(/\.json\(\s*\{([^}]*)\}/g, chunk).flatMap((b) => all(/(\w+)\s*(?::|,|$)/g, b)),
    ...all(/json_encode\(\s*\[([^\]]*)\]/g, chunk).flatMap((b) => all(/['"](\w+)['"]\s*=>/g, b)),
    ...all(/jsonify\(([^)]*)\)/g, chunk).flatMap((b) => [...all(/(\w+)\s*=/g, b), ...all(/["'](\w+)["']\s*:/g, b)]),
    ...all(/return\s*\{([^}]*)\}/g, chunk).flatMap((b) => all(/["'](\w+)["']\s*:/g, b)),
  ]).filter((x) => !["error", "status", "message", "headers"].includes(x));
  return { inputs, outputs, checksSession: /session|cookie|auth|login|current_?user|isAuthenticated/i.test(chunk), excerpt: chunk.slice(0, 900) };
}

function formsIn(root: string, file: string, code: string): FormInfo | null {
  if (!/<form\b|fetch\(|axios\.|\$\.ajax|["'`]\/api\//.test(code)) return null;
  const labels = new Map<string, string>();
  for (const m of code.matchAll(/<label[^>]*for=["'](\w+)["'][^>]*>\s*([^<]+?)\s*</g)) labels.set(m[1]!, m[2]!.trim());
  const fields: FormInfo["fields"] = [];
  for (const m of code.matchAll(/<(input|textarea|select)\b[^>]*\bname=["'](\w+)["'][^>]*>/gi)) {
    const tag = m[0];
    const name = m[2]!;
    if (fields.some((f) => f.name === name) || /type=["'](hidden|submit|button)["']/.test(tag)) continue;
    const kind = m[1]!.toLowerCase();
    const type = kind === "textarea" ? "textarea" : kind === "select" ? "select" : (/type=["'](\w+)["']/.exec(tag)?.[1] ?? "text");
    const idAttr = /\bid=["'](\w+)["']/.exec(tag)?.[1];
    const field: FormInfo["fields"][number] = { name, type, label: labels.get(idAttr ?? name) };
    if (type === "select") {
      const block = new RegExp(`<select\\b[^>]*name=["']${name}["'][\\s\\S]*?</select>`, "i").exec(code)?.[0] ?? "";
      field.options = [...block.matchAll(/<option[^>]*value=["']([^"']+)["'][^>]*>\s*([^<]*)</g)].map((o) => ({ value: o[1]!, label: o[2]!.trim() || o[1]! }));
    }
    fields.push(field);
  }
  const calls = uniq([...all(/["'`](\/[\w\-./]*api[\w\-./]*)["'`?]/gi, code), ...all(/<form[^>]*action=["']([^"']+)["']/gi, code)]);
  if (fields.length === 0 && calls.length === 0) return null;
  // Best guess of the URL users open. Static/PHP/JSP files keep their extension (that's the real URL);
  // template-engine files (ejs, twig…) are rendered by routes, so their extension is dropped.
  const rel = posixRel(root, file).replace(/^(public|static|www|templates|views|pages|resources\/views)\//, "");
  const page = `/${rel.replace(/(^|\/)index\.\w+$/, "$1").replace(/\.(ejs|hbs|erb|twig|njk|cshtml)$/, "")}`;
  return { page, file: posixRel(root, file), fields, calls };
}

export function scanAnyProject(project: Project): ScanResult {
  const routes: RouteInfo[] = [];
  const forms: FormInfo[] = [];
  for (const file of walk(project.root)) {
    const ext = extname(file).toLowerCase();
    if (!BACKEND_EXT.has(ext) && !TEMPLATE_EXT.has(ext)) continue;
    const code = readFileSync(file, "utf8");
    if (BACKEND_EXT.has(ext)) {
      for (const d of declarations(code, file, project.root)) {
        const existing = routes.find((r) => r.path === d.path);
        const io = ioNear(code, d.index);
        if (existing) {
          existing.methods = uniq([...existing.methods, d.method]);
          continue;
        }
        routes.push({ path: d.path, methods: [d.method], ...io, file: posixRel(project.root, file) });
      }
    }
    if (TEMPLATE_EXT.has(ext)) {
      const f = formsIn(project.root, file, code);
      if (f) forms.push(f);
    }
  }
  return { routes, forms };
}
