import type { MemoryPage, MemorySection, SiteMemory } from "@intent0/schema";

const STOP = new Set(
  "a an and are as at be by can do does for from get go how i in is it me my of on or show the this to use using want what when where which with you your need please about docs doc documentation guide".split(
    " ",
  ),
);
const NEGATION = new Set(["not", "without", "except", "no", "excluding"]);

/** Lowercase words, light stemming ("installs"/"installing" → "install"). Shared by indexing and search. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9.+#-]*[a-z0-9+#]|[a-z0-9]/g) ?? [])
    .filter((w) => !STOP.has(w))
    .map(stem);
}

export function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export interface SearchHit {
  section: MemorySection;
  page: MemoryPage;
  score: number;
}

export interface MemoryIndex {
  search(query: string, limit?: number): SearchHit[];
  /** Every topic the site's content mentions. */
  topics: Set<string>;
  page(id: string): MemoryPage | undefined;
}

/**
 * Keyword search (BM25) over the site's sections, with a topic focus: if the query names
 * a topic that only part of the site covers (e.g. "vue"), results are limited to sections
 * about it; "not react" / "without react" excludes a topic. No model and no embeddings needed.
 */
export function createMemoryIndex(memory: SiteMemory): MemoryIndex {
  const pages = new Map(memory.pages.map((p) => [p.id, p]));
  const docs = memory.sections.map((s) => {
    const page = pages.get(s.page);
    // Headings and topics say what a section is about, so they count more than body text.
    const weighted = [
      ...tokenize([...s.path, page?.title ?? ""].join(" ")).flatMap((t) => [t, t, t]),
      ...s.topics.map(stem).flatMap((t) => [t, t]),
      ...tokenize(s.text),
      ...tokenize(s.code.map((c) => `${c.lang} ${c.code}`).join(" ")),
    ];
    const tf = new Map<string, number>();
    for (const t of weighted) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { section: s, page, tf, len: weighted.length, topics: new Set(s.topics.map(stem)) };
  });
  const n = docs.length || 1;
  const avgLen = docs.reduce((a, d) => a + d.len, 0) / n || 1;
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const topicDf = new Map<string, number>();
  for (const d of docs) for (const t of d.topics) topicDf.set(t, (topicDf.get(t) ?? 0) + 1);
  const topics = new Set(topicDf.keys());

  function search(query: string, limit = 6): SearchHit[] {
    const words = (query.toLowerCase().match(/[a-z0-9][a-z0-9.+#-]*[a-z0-9+#]|[a-z0-9]/g) ?? []).map(stem);
    const excluded = new Set<string>();
    words.forEach((w, i) => {
      if (NEGATION.has(words[i - 1] ?? "") && topics.has(w)) excluded.add(w);
    });
    const terms = [...new Set(tokenize(query))].filter((t) => !excluded.has(t));
    if (terms.length === 0) return [];

    // A topic is a "focus" when the visitor names it and only part of the site covers it.
    const focus = terms.filter((t) => topics.has(t) && (topicDf.get(t) ?? 0) < n * 0.6);

    const k1 = 1.2;
    const b = 0.75;
    let scored = docs.map((d) => {
      let score = 0;
      for (const t of terms) {
        const f = d.tf.get(t) ?? 0;
        if (!f) continue;
        const idf = Math.log(1 + (n - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / avgLen)));
      }
      return { d, score };
    });

    scored = scored.filter(({ d }) => ![...excluded].some((t) => d.topics.has(t) && !focus.some((f) => d.topics.has(f))));
    if (focus.length > 0) {
      const focused = scored.filter(({ d }) => focus.some((f) => d.topics.has(f)));
      if (focused.some((x) => x.score > 0)) scored = focused;
    }
    return scored
      .filter((x) => x.score > 0 && x.d.page)
      .sort((a, b2) => b2.score - a.score)
      .slice(0, limit)
      .map(({ d, score }) => ({ section: d.section, page: d.page!, score }));
  }

  return { search, topics, page: (id) => pages.get(id) };
}
