import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Marked, type Tokens } from "marked";

const DIR = join(process.cwd(), "content", "docs");

export interface Doc {
  slug: string;
  title: string;
  order: number;
  body: string;
}

/** Same slugs as intent0's Site Memory, so cited sources land on the right heading. */
const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");

const marked = new Marked({
  renderer: {
    heading(this: { parser: { parseInline(tokens: Tokens.Heading["tokens"]): string } }, { tokens, depth, text }: Tokens.Heading) {
      return `<h${depth} id="${slugify(text)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
  },
});

function parse(slug: string, raw: string): Doc {
  const front = /^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, "\n"));
  const meta = Object.fromEntries((front?.[1] ?? "").split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  return { slug, title: meta.title ?? slug, order: Number(meta.order ?? 99), body: raw.replace(/\r\n/g, "\n").slice(front?.[0].length ?? 0) };
}

export function allDocs(): Doc[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parse(f.slice(0, -3), readFileSync(join(DIR, f), "utf8")))
    .sort((a, b) => a.order - b.order);
}

export function renderDoc(doc: Doc): string {
  return marked.parse(doc.body, { async: false });
}
