import * as z from "zod";
import { SitePath } from "./common";

/**
 * Site Memory: what intent0 knows about a website's content and how it connects.
 * Built by `intent0 index` from the site's own docs/pages; never written by a model.
 *
 *   Page ──has──► Section ──mentions──► Topic
 *                    └──contains──► CodeBlock (verbatim)
 *   Page ──links to──► Page
 * Tasks (from the manifest) are linked to topics at runtime.
 */

const NodeId = z.string().regex(/^[a-z]\d+$/, "node ids look like p1, s12, c3");

export const MemoryPage = z.strictObject({
  id: NodeId,
  url: SitePath,
  title: z.string(),
  /** Where it came from: a file in the repo or a crawled URL. */
  source: z.string(),
});
export type MemoryPage = z.infer<typeof MemoryPage>;

export const CodeBlock = z.strictObject({
  id: NodeId,
  lang: z.string(),
  code: z.string(),
  /** How many lines of the section's text come before this code block (its place in the section). */
  after: z.number().int().min(0).optional(),
});
export type CodeBlock = z.infer<typeof CodeBlock>;

export const MemorySection = z.strictObject({
  id: NodeId,
  page: NodeId,
  /** Heading trail, e.g. ["Getting started", "Install"]. */
  path: z.array(z.string()),
  /** Anchor on the page for linking straight to this section, if known. */
  anchor: z.string().optional(),
  text: z.string(),
  code: z.array(CodeBlock).default([]),
  topics: z.array(z.string()).default([]),
});
export type MemorySection = z.infer<typeof MemorySection>;

export const SiteMemory = z.strictObject({
  memoryVersion: z.literal(1),
  builtAt: z.string(),
  pages: z.array(MemoryPage),
  sections: z.array(MemorySection),
  /** [fromPageId, toPageId] */
  links: z.array(z.tuple([NodeId, NodeId])).default([]),
});
export type SiteMemory = z.infer<typeof SiteMemory>;
