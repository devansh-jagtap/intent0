import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative, sep } from "node:path";
import { parse, type HTMLElement } from "node-html-parser";
import { stem, tokenize } from "@intent0/core";
import type { SiteMemory } from "@intent0/schema";

/*
 * Builds Site Memory from a website's own content, without any model:
 *   - Markdown/MDX files in the repo (docs, guides, content folders), and/or
 *   - the running site's HTML pages (crawl), for content that lives in pages, a CMS or a database.
 * Sections are split by heading so each is one idea; code blocks are kept whole and verbatim;
 * every section keeps its page URL and heading anchor so answers can cite it.
 */

interface Draft {
  url: string;
  title: string;
  source: string;
  sections: { path: string[]; anchor?: string; parts: ({ text: string } | { lang: string; code: string })[] }[];
  links: string[];
}

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".turbo", "intent0", ".github", "vendor", "test", "tests", "__tests__", "fixtures"]);
const SKIP_FILES = /^(changelog|license|licence|code_of_conduct|contributing|security|agents|claude)\.mdx?$/i;
const MAX_SECTION_CHARS = 2_500;

/** Words that usually name a technology; a section mentioning one is "about" it (e.g. Vue vs React). */
const TECH = new Set(
  "vue nuxt react next nextjs angular svelte sveltekit solid remix astro qwik express nestjs fastify hono koa node deno bun python django flask fastapi go golang rust java kotlin spring php laravel ruby rails dotnet csharp postgres postgresql mysql mariadb sqlite mongodb sqlserver cockroachdb planetscale supabase neon redis typescript javascript docker kubernetes vercel netlify aws azure gcp cloudflare graphql rest trpc prisma drizzle typeorm sequelize mongoose tailwind vite webpack jest vitest playwright cypress expo flutter ios android electron tauri".split(
    " ",
  ),
);
const LANG_ALIAS: Record<string, string> = { js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", sh: "shell", bash: "shell", zsh: "shell", console: "shell", yml: "yaml", py: "python" };

export const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");

// ---------------- Markdown / MDX ----------------

function markdownFiles(dir: string, out: string[] = []): string[] {
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
    if (st.isDirectory()) markdownFiles(full, out);
    else if (/\.mdx?$/i.test(name) && !SKIP_FILES.test(name) && st.size < 500_000) out.push(full);
  }
  return out;
}

/** "content/docs/vue/setup.md" → "/docs/vue/setup"; a Next.js app/…/page.mdx → its route. */
function urlForFile(root: string, file: string, frontSlug?: string): string {
  if (frontSlug) return frontSlug.startsWith("/") ? frontSlug : `/${frontSlug}`;
  let rel = relative(root, file).split(sep).join("/");
  rel = rel.replace(/^(src\/)?(app|pages)\//, "").replace(/^(src\/)?content\//, "");
  rel = rel.replace(/\.mdx?$/i, "").replace(/(^|\/)(index|readme|page)$/i, "");
  rel = rel.split("/").filter((s) => !(s.startsWith("(") && s.endsWith(")"))).join("/");
  return `/${rel}`.replace(/\/+$/, "") || "/";
}

function cleanMarkdown(line: string): string {
  // Inline code is kept exactly (e.g. `</body>`, `search_site`): set aside, clean the rest, put back.
  const codes: string[] = [];
  return line
    .replace(/`([^`]+)`/g, (_, code: string) => `\u0000${codes.push(code) - 1}\u0000`)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/(\*\*|__|\*|_|~~)(\S[^*_~]*?)\1/g, "$2")
    .replace(/^\s*(>|[-*+]|\d+\.)\s+/, "")
    .replace(/\|/g, " ")
    .replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)]!)
    .trim();
}

export function parseMarkdown(raw: string, url: string, source: string): Draft {
  let body = raw.replace(/\r\n/g, "\n");
  let title = "";
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(body);
  if (fm) {
    title = /^title:\s*["']?(.+?)["']?\s*$/m.exec(fm[1]!)?.[1] ?? "";
    body = body.slice(fm[0].length);
  }
  const draft: Draft = { url, title, source, sections: [], links: [] };
  const stack: string[] = [];
  let current: Draft["sections"][number] = { path: [], parts: [] };
  let fence: { marker: string; lang: string; lines: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    const text = para.map(cleanMarkdown).filter(Boolean).join(" ").trim();
    if (text) current.parts.push({ text });
    para = [];
  };
  const startSection = (level: number, heading: string) => {
    flushPara();
    if (current.parts.length) draft.sections.push(current);
    stack.length = Math.max(0, level - 1);
    stack[level - 1] = heading;
    current = { path: stack.filter(Boolean), anchor: slugify(heading), parts: [] };
  };

  for (const line of body.split("\n")) {
    if (fence) {
      if (line.trim().startsWith(fence.marker)) {
        current.parts.push({ lang: fence.lang, code: fence.lines.join("\n") });
        fence = null;
      } else fence.lines.push(line);
      continue;
    }
    const open = /^\s*(```+|~~~+)\s*([\w+#-]*)/.exec(line);
    if (open) {
      flushPara();
      fence = { marker: open[1]!, lang: (open[2] || "text").toLowerCase(), lines: [] };
      continue;
    }
    for (const m of line.matchAll(/\]\((\/[^)\s#]*)/g)) draft.links.push(m[1]!);
    if (/^\s*(import|export)\s/.test(line)) continue;
    const h = /^(#{1,4})\s+(.+?)\s*#*$/.exec(line);
    if (h) {
      const text = cleanMarkdown(h[2]!);
      if (h[1]!.length === 1 && !title) title = text;
      startSection(h[1]!.length, text);
      continue;
    }
    if (line.trim() === "") flushPara();
    else {
      // Each list item is its own line, so steps and options stay apart.
      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) flushPara();
      para.push(line);
    }
  }
  flushPara();
  if (current.parts.length) draft.sections.push(current);
  if (!title) title = basename(source).replace(/\.mdx?$/i, "");
  return draft;
}

// ---------------- Crawl ----------------

// Files, APIs, and private areas (admin, dashboards, accounts) are never read as visitor content.
const SKIP_URL =
  /\.(png|jpe?g|gif|svg|webp|ico|pdf|zip|css|js|json|xml|txt|mp4|woff2?)$|^\/(api|intent0|_next)\/|^\/(admin|dashboard|account|accounts|profile|settings|login|logout|signin|signup|sign-in|sign-up|auth|officer|staff|internal)(\/|$)/i;

/**
 * Visible text of an element, with a space between separate elements
 * (<span>Notice</span><time>6 October</time> → "Notice 6 October", not "Notice6 October").
 */
function textOf(node: HTMLElement): string {
  const out: string[] = [];
  const walk = (n: HTMLElement) => {
    if (n.nodeType === 3) out.push(n.text);
    else if (n.nodeType === 1 && !/^(script|style|noscript|svg)$/i.test(n.tagName ?? "")) {
      for (const c of n.childNodes) walk(c as HTMLElement);
      out.push(" ");
    }
  };
  walk(node);
  return out.join("").replace(/\s+/g, " ").replace(/\s+([.,;:!?)])/g, "$1").trim();
}

function codeLang(pre: HTMLElement): string {
  const cls = `${pre.getAttribute("class") ?? ""} ${pre.querySelector("code")?.getAttribute("class") ?? ""}`;
  return (/(?:language|lang)-([\w+#-]+)/.exec(cls)?.[1] ?? pre.getAttribute("data-language") ?? "text").toLowerCase();
}

/** Text of a card minus its code blocks (code is kept separately, verbatim). */
function textWithout(text: string, codes: string[]): string {
  let out = text;
  for (const c of codes) out = out.replace(c.replace(/\s+/g, " ").trim(), " ");
  return out.replace(/\s+/g, " ").trim();
}

export function parseHtml(html: string, url: string): Draft {
  // Parse inside <pre> (the default keeps it as raw text), so <pre><code>…</code></pre> gives clean code.
  const root = parse(html, { blockTextElements: { script: true, noscript: true, style: true } });
  // "Notices & circulars · Aranya Citizen Services" → "Notices & circulars" (drop the site-name suffix).
  const rawTitle = (root.querySelector("title")?.text || root.querySelector("h1")?.text || url).replace(/\s+/g, " ").trim();
  const title = rawTitle.split(/\s+[·|—–-]\s+/)[0] || rawTitle;
  // Collect links first: menus and footers are how a crawler finds the rest of the site.
  const origin = new URL(url).origin;
  const links: string[] = [];
  for (const a of root.querySelectorAll("a[href]")) {
    try {
      const u = new URL(a.getAttribute("href")!, url);
      if (u.origin === origin && !SKIP_URL.test(u.pathname)) links.push(u.pathname.replace(/\/+$/, "") || "/");
    } catch {
      /* ignore bad links */
    }
  }
  // Then drop the chrome (menus, header, footer) so only the page's own content is indexed.
  for (const el of root.querySelectorAll("script, style, noscript, nav, footer, header, aside, svg, form, [data-intent0]")) el.remove();
  const main = root.querySelector("main, article, [role=main]") ?? root.querySelector("body") ?? root;

  const draft: Draft = { url, title, source: url, sections: [], links: [] };
  const stack: string[] = [];
  let current: Draft["sections"][number] = { path: [], parts: [] };
  // Cards (a list item / article / box with one heading, like a notice or a product) become one
  // section each, with everything inside them: date, category, id, text and code.
  const cards = new Set<HTMLElement>();
  const insideCard = (el: HTMLElement) => {
    for (let p = el.parentNode as HTMLElement | null; p && p !== main; p = p.parentNode as HTMLElement | null) if (cards.has(p)) return true;
    return false;
  };
  for (const el of main.querySelectorAll("h1, h2, h3, h4, p, li, pre, blockquote, td, dt, dd, article, section, div")) {
    const tag = el.tagName.toLowerCase();
    if (insideCard(el)) continue;
    if (/^(li|article|section|div)$/.test(tag)) {
      const heads = el.querySelectorAll("h2, h3, h4");
      const all = textOf(el);
      if (heads.length === 1 && !el.querySelector("h1") && all.length > textOf(heads[0]!).length + 10 && all.length < 3_000) {
        if (current.parts.length) draft.sections.push(current);
        const head = heads[0]!;
        const heading = textOf(head);
        const level = Number(head.tagName[1]);
        const rest = all.replace(heading, " ");
        const code = el.querySelectorAll("pre").map((pre) => ({ lang: codeLang(pre), code: pre.text.replace(/\n+$/, "") }));
        draft.sections.push({
          path: [...stack.slice(0, level - 1).filter(Boolean), heading],
          anchor: el.getAttribute("id") ?? head.getAttribute("id") ?? slugify(heading),
          parts: [{ text: textWithout(rest, code.map((c) => c.code)) }, ...code],
        });
        cards.add(el);
        current = { path: stack.filter(Boolean), parts: [] };
        continue;
      }
      if (tag !== "li") continue; // plain wrapper: its children are read one by one
    }
    if (/^h[1-4]$/.test(tag)) {
      if (current.parts.length) draft.sections.push(current);
      const level = Number(tag[1]);
      const heading = textOf(el);
      stack.length = Math.max(0, level - 1);
      stack[level - 1] = heading;
      current = { path: stack.filter(Boolean), anchor: el.getAttribute("id") ?? slugify(heading), parts: [] };
      continue;
    }
    // Skip text nested inside another collected block (e.g. <p> inside <li>).
    if (el.parentNode && (el.parentNode as HTMLElement).closest?.("li, pre, blockquote, td, dd")) continue;
    if (tag === "pre") {
      current.parts.push({ lang: codeLang(el), code: el.text.replace(/\n+$/, "") });
    } else {
      const text = textOf(el);
      if (text) current.parts.push({ text });
    }
  }
  if (current.parts.length) draft.sections.push(current);
  draft.links = links;
  return draft;
}

async function crawl(start: string, maxPages: number, log: (s: string) => void): Promise<Draft[]> {
  const origin = new URL(start).origin;
  const queue = [new URL(start).pathname || "/"];
  const seen = new Set(queue);
  const drafts: Draft[] = [];
  while (queue.length && drafts.length < maxPages) {
    const path = queue.shift()!;
    try {
      const res = await fetch(origin + path, { signal: AbortSignal.timeout(15_000), headers: { "user-agent": "intent0-indexer" } });
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) continue;
      const draft = parseHtml(await res.text(), origin + path);
      draft.url = path;
      drafts.push(draft);
      for (const l of draft.links) if (!seen.has(l) && !SKIP_URL.test(l)) (seen.add(l), queue.push(l));
    } catch (err) {
      log(`    Couldn't read ${path}: ${(err as Error).message}`);
    }
  }
  return drafts;
}

// ---------------- Build ----------------

function topicsFor(text: string, path: string[], langs: string[], df: Map<string, number>, n: number): string[] {
  const words = tokenize(text);
  const tf = new Map<string, number>();
  for (const w of words) tf.set(w, (tf.get(w) ?? 0) + 1);
  const tech = [...new Set(words.filter((w) => TECH.has(w)))];
  const headingWords = tokenize(path.join(" ")).filter((w) => w.length > 2 && !/^\d+$/.test(w));
  const top = [...tf.entries()]
    .filter(([w]) => w.length > 3 && !/^\d+$/.test(w))
    .map(([w, f]) => [w, f * Math.log(n / (df.get(w) ?? 1))] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
  return [...new Set([...tech, ...langs.map((l) => stem(LANG_ALIAS[l] ?? l)), ...headingWords, ...top])].filter((t) => t !== "text").slice(0, 16);
}

export interface IndexOptions {
  root: string;
  crawl?: string;
  maxPages?: number;
  log: (s: string) => void;
}

export async function buildMemory({ root, crawl: crawlUrl, maxPages = 150, log }: IndexOptions): Promise<SiteMemory> {
  const drafts: Draft[] = [];
  // The repo's own README is for developers, not site visitors.
  const files = markdownFiles(root).filter((f) => !(relative(root, f).split(sep).length === 1 && /^readme\.mdx?$/i.test(basename(f))));
  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const slug = /^---\n[\s\S]*?^slug:\s*["']?(.+?)["']?\s*$[\s\S]*?\n---/m.exec(raw.replace(/\r\n/g, "\n"))?.[1];
    drafts.push(parseMarkdown(raw, urlForFile(root, file, slug), relative(root, file).split(sep).join("/")));
  }
  if (files.length) log(`  Read ${files.length} Markdown/MDX file(s).`);
  if (crawlUrl) {
    log(`  Crawling ${crawlUrl} (up to ${maxPages} pages)…`);
    const crawled = await crawl(crawlUrl, maxPages, log);
    // A page that exists both as a file and on the live site: keep the file (cleaner) version.
    const have = new Set(drafts.map((d) => d.url));
    drafts.push(...crawled.filter((d) => !have.has(d.url)));
    log(`  Read ${crawled.length} page(s) from the running site.`);
  }

  // Split very long sections at paragraph boundaries, keeping each code block with its text.
  const flat: { draft: Draft; path: string[]; anchor?: string; text: string; code: { lang: string; code: string; after: number }[] }[] = [];
  for (const d of drafts) {
    for (const s of d.sections) {
      let text: string[] = [];
      let code: { lang: string; code: string; after: number }[] = [];
      let size = 0;
      const push = () => {
        if (text.length || code.length) flat.push({ draft: d, path: s.path.length ? s.path : [d.title], anchor: s.anchor, text: text.join("\n"), code });
        text = [];
        code = [];
        size = 0;
      };
      for (const part of s.parts) {
        if ("text" in part) {
          if (size + part.text.length > MAX_SECTION_CHARS && size > 0) push();
          text.push(part.text);
          size += part.text.length;
        } else code.push({ lang: part.lang, code: part.code, after: text.length });
      }
      push();
    }
  }

  const df = new Map<string, number>();
  for (const f of flat) for (const w of new Set(tokenize(`${f.path.join(" ")} ${f.text}`))) df.set(w, (df.get(w) ?? 0) + 1);

  const pageIds = new Map<string, string>();
  const pages: SiteMemory["pages"] = [];
  for (const d of drafts) {
    if (pageIds.has(d.url) || !d.url.startsWith("/")) continue;
    const id = `p${pages.length + 1}`;
    pageIds.set(d.url, id);
    pages.push({ id, url: d.url, title: d.title.slice(0, 200), source: d.source });
  }
  let codeCount = 0;
  const sections: SiteMemory["sections"] = flat
    .filter((f) => pageIds.has(f.draft.url))
    .map((f, i) => ({
      id: `s${i + 1}`,
      page: pageIds.get(f.draft.url)!,
      path: f.path.map((p) => p.slice(0, 200)),
      ...(f.anchor ? { anchor: f.anchor } : {}),
      text: f.text,
      code: f.code.map((c) => ({ id: `c${++codeCount}`, lang: c.lang, code: c.code, after: c.after })),
      topics: topicsFor(`${f.path.join(" ")} ${f.text} ${f.code.map((c) => c.code).join(" ")}`, f.path, f.code.map((c) => c.lang), df, flat.length),
    }));

  const links: [string, string][] = [];
  for (const d of drafts) {
    const from = pageIds.get(d.url);
    for (const l of new Set(d.links)) {
      const to = pageIds.get(l.replace(/\/+$/, "") || "/");
      if (from && to && from !== to) links.push([from, to]);
    }
  }
  return { memoryVersion: 1, builtAt: new Date().toISOString(), pages, sections, links };
}

/** Short summary for the terminal: most common topics. */
export function topTopics(memory: SiteMemory, count = 12): string[] {
  const freq = new Map<string, number>();
  for (const s of memory.sections) for (const t of s.topics) freq.set(t, (freq.get(t) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, count).map(([t, c]) => `${t} (${c})`);
}

export const isMarkdownFile = (f: string) => /\.mdx?$/i.test(extname(f));
