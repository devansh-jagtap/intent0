import type { SearchHit } from "@intent0/core";
import type { ContentPage, Flow, MemorySection, PageNode, SiteMemory } from "@intent0/schema";

/*
 * Turning a question into an experience: the sections that answer it, completed with the steps
 * around them, and (without a model) a guided page built from how the site's own docs are laid out.
 * Everything shown still comes from Site Memory: text is cited, code is placed by reference.
 */

const num = (id: string) => Number(id.slice(1));
const parentKey = (s: MemorySection) => `${s.page}|${s.path.slice(0, -1).join("›")}`;
const lines = (s: MemorySection) => s.text.split("\n").map((l) => l.trim()).filter(Boolean);
/** Sentences end at . ! or ? followed by a space, so "Node.js" or "v1.2" stay whole. */
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
const firstSentences = (text: string, max = 220) =>
  sentences(text).reduce((acc, s) => (!acc || acc.length + s.length < max ? `${acc} ${s}`.trim() : acc), "");

/**
 * The search hits plus what a visitor needs around them: the other steps of the same how-to
 * (sibling sections under one heading), that how-to's own introduction, and the page's opening.
 */
export function expandHits(hits: SearchHit[], memory: SiteMemory, limit = 18): SearchHit[] {
  const pages = new Map(memory.pages.map((p) => [p.id, p]));
  const out = new Map(hits.map((h) => [h.section.id, h]));
  const add = (s: MemorySection | undefined, score: number) => {
    if (!s || out.has(s.id) || out.size >= limit) return;
    const page = pages.get(s.page);
    if (page) out.set(s.id, { section: s, page, score });
  };
  for (const h of hits) {
    const s = h.section;
    if (s.path.length >= 3) for (const sib of memory.sections) if (parentKey(sib) === parentKey(s) && sib.path.length === s.path.length) add(sib, h.score * 0.9);
    const parentPath = s.path.slice(0, -1).join("›");
    add(memory.sections.find((x) => x.page === s.page && x.path.join("›") === parentPath), h.score * 0.8);
    add(memory.sections.find((x) => x.page === s.page && x.path.length === 1), h.score * 0.5);
  }
  return [...out.values()];
}

/** A how-to: two or more sections under one heading, in the order the docs give them. */
interface Group {
  parent?: MemorySection;
  label: string;
  steps: MemorySection[];
  score: number;
}

function groupsOf(hits: SearchHit[]): Group[] {
  const all = hits.map((h) => h.section);
  const groups = new Map<string, Group>();
  for (const h of hits) {
    const s = h.section;
    if (s.path.length < 3) continue;
    const key = parentKey(s);
    const g = groups.get(key) ?? { label: s.path[s.path.length - 2]!, steps: [], score: 0 };
    g.steps.push(s);
    g.score = Math.max(g.score, h.score);
    g.parent ??= all.find((x) => x.page === s.page && x.path.join("›") === s.path.slice(0, -1).join("›"));
    groups.set(key, g);
  }
  return [...groups.values()].filter((g) => g.steps.length >= 2).map((g) => ({ ...g, steps: g.steps.sort((a, b) => num(a.id) - num(b.id)) })).sort((a, b) => b.score - a.score);
}

/** One section as page blocks: its lines (a lead-in ending in ":" opens a list) with its code in place. */
function sectionBlocks(s: MemorySection, asChecklist: boolean): PageNode[] {
  const text = lines(s);
  const cites = [s.id];
  if (asChecklist && text.length) return [{ component: "Checklist", props: { items: text.slice(0, 6), cites } }, ...s.code.map((c) => ({ component: "CodeBlock", props: { ref: c.id } }))];
  const blocks: PageNode[] = [];
  let list: string[] | null = null;
  const closeList = () => {
    if (list?.length) blocks.push({ component: "List", props: { items: list, cites } });
    list = null;
  };
  const codeAt = (i: number) => s.code.filter((c) => (c.after ?? text.length) === i).forEach((c) => (closeList(), blocks.push({ component: "CodeBlock", props: { ref: c.id } })));
  text.forEach((line, i) => {
    codeAt(i);
    if (list) list.push(line);
    else {
      blocks.push({ component: "Paragraph", props: { text: line.slice(0, 1_400), cites } });
      if (line.endsWith(":") && i + 1 < text.length && !s.code.some((c) => c.after === i + 1)) list = [];
    }
  });
  codeAt(text.length);
  closeList();
  return blocks;
}

const isCheck = (title: string) => /\b(check|verify|test|confirm)\b|works?$/i.test(title);

function stepsFor(g: Group): PageNode {
  return {
    component: "Steps",
    props: {},
    children: g.steps.map((s) => {
      const title = s.path[s.path.length - 1]!;
      return { component: "Step", props: { title: title.slice(0, 90) }, children: sectionBlocks(s, isCheck(title)) };
    }),
  };
}

function factsFor(s: MemorySection | undefined): PageNode[] {
  if (!s) return [];
  const items = s.text.split("\n").flatMap(sentences).filter((x) => x.length <= 90).slice(0, 3);
  return items.length ? [{ component: "Facts", props: { items, cites: [s.id] } }] : [];
}

/**
 * Without a model: a page made directly from the site's own structure. A how-to in the docs
 * becomes a guided walk-through; two how-tos for the same question become a choice.
 */
export function templateExperience(query: string, hits: SearchHit[], tasks: Flow[], lang: string): ContentPage {
  const top = hits[0]!;
  const opening = hits.find((h) => h.page.id === top.page.id && h.section.path.length === 1)?.section;
  const groups = groupsOf(hits).slice(0, 4);
  const blocks: PageNode[] = [];
  const intro = opening ?? top.section;
  if (intro.text) blocks.push({ component: "Intro", props: { text: firstSentences(intro.text.split("\n")[0]!), cites: [intro.id] } });

  if (groups.length >= 2) {
    blocks.push({
      component: "Choice",
      props: { label: "Choose yours" },
      children: groups.map((g) => ({ component: "Option", props: { label: g.label.slice(0, 90) }, children: [...factsFor(g.parent), stepsFor(g)] })),
    });
  } else if (groups.length === 1) {
    blocks.push(...factsFor(groups[0]!.parent), stepsFor(groups[0]!));
  } else {
    for (const h of hits.slice(0, 4)) {
      if (h.section === intro && !h.section.code.length) continue;
      blocks.push({ component: "Section", props: { heading: h.section.path.join(" › ").slice(0, 90) }, children: sectionBlocks(h.section, false) });
    }
  }
  for (const t of tasks) blocks.push({ component: "TaskCard", props: { flowId: t.id, label: t.title } });
  if (blocks.length === 0) blocks.push({ component: "Paragraph", props: { text: top.section.text.slice(0, 700) || top.section.path.join(" › "), cites: [top.section.id] } });
  const title = groups.length === 1 ? groups[0]!.label : query.charAt(0).toUpperCase() + query.slice(1);
  return { kind: "content", lang, title: title.slice(0, 200), blocks };
}
