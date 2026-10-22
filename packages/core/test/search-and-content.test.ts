import { describe, expect, it } from "vitest";
import { SiteMemory } from "@intent0/schema";
import { createMemoryIndex, validateContentPage } from "../src/index";

const memory = SiteMemory.parse({
  memoryVersion: 1,
  builtAt: "2026-10-18T00:00:00Z",
  pages: [
    { id: "p1", url: "/docs/getting-started/vue", title: "Prisma with Vue", source: "docs/vue.md" },
    { id: "p2", url: "/docs/getting-started/react", title: "Prisma with React", source: "docs/react.md" },
    { id: "p3", url: "/docs/getting-started", title: "Getting started", source: "docs/index.md" },
  ],
  sections: [
    { id: "s1", page: "p1", path: ["Prisma with Vue", "Setup"], text: "Install Prisma in your Vue app and query from a server route.", code: [{ id: "c1", lang: "shell", code: "npm install prisma" }], topics: ["vue", "setup", "install"] },
    { id: "s2", page: "p2", path: ["Prisma with React", "Setup"], text: "Install Prisma in your React app and query from a server route.", code: [{ id: "c2", lang: "shell", code: "npm install prisma" }], topics: ["react", "setup", "install"] },
    { id: "s3", page: "p3", path: ["Getting started"], text: "Prisma is an ORM for Node.js and TypeScript. Setup takes a few minutes.", code: [], topics: ["setup", "orm"] },
  ],
  links: [],
});
const index = createMemoryIndex(memory);

describe("Site Memory search", () => {
  it("keeps only sections about the framework the visitor names", () => {
    const ids = index.search("prisma setup for vue").map((h) => h.section.id);
    expect(ids).toContain("s1");
    expect(ids).not.toContain("s2");
  });

  it("excludes a topic the visitor rules out", () => {
    const ids = index.search("setup not react").map((h) => h.section.id);
    expect(ids).not.toContain("s2");
    expect(ids.length).toBeGreaterThan(0);
  });

  it("returns nothing for something the site doesn't cover", () => {
    expect(index.search("book a train ticket")).toEqual([]);
  });
});

describe("information page rules", () => {
  const allowed = { sectionIds: new Set(["s1"]), codeIds: new Set(["c1"]), flowIds: new Set(["apply_passport"]) };
  const page = (blocks: unknown[]) => ({ kind: "content", lang: "en", title: "Prisma with Vue", blocks });

  it("accepts cited text, referenced code and approved task cards", () => {
    const r = validateContentPage(
      page([
        { component: "Section", props: { heading: "Setup" }, children: [
          { component: "Paragraph", props: { text: "Install Prisma first.", cites: ["s1"] } },
          { component: "CodeBlock", props: { ref: "c1" } },
        ] },
        { component: "TaskCard", props: { flowId: "apply_passport", label: "Apply" } },
      ]),
      allowed,
    );
    expect(r.ok ? [] : r.errors).toEqual([]);
  });

  it("rejects text without a citation, or citing a section that wasn't retrieved", () => {
    const r = validateContentPage(page([{ component: "Paragraph", props: { text: "Trust me.", cites: [] } }, { component: "Paragraph", props: { text: "x", cites: ["s2"] } }]), allowed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/must cite[\s\S]*unknown section "s2"/);
  });

  it("rejects code the docs don't contain and tasks that aren't approved", () => {
    const r = validateContentPage(page([{ component: "CodeBlock", props: { ref: "c9" } }, { component: "TaskCard", props: { flowId: "delete_account" } }]), allowed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/doesn't exist[\s\S]*isn't an approved task/);
  });

  it("accepts an experience: intro, facts, a choice of guided steps and a checklist", () => {
    const r = validateContentPage(
      page([
        { component: "Intro", props: { text: "Set up Prisma in your Vue app.", cites: ["s1"] } },
        { component: "Facts", props: { items: ["A few minutes"], cites: ["s1"] } },
        { component: "Choice", props: { label: "Which app?" }, children: [
          { component: "Option", props: { label: "Vue" }, children: [
            { component: "Steps", props: {}, children: [
              { component: "Step", props: { title: "Install" }, children: [{ component: "CodeBlock", props: { ref: "c1" } }] },
              { component: "Step", props: { title: "Check it" }, children: [{ component: "Checklist", props: { items: ["Query from a server route"], cites: ["s1"] } }] },
            ] },
          ] },
          { component: "Option", props: { label: "Also Vue" }, children: [{ component: "Paragraph", props: { text: "Same steps.", cites: ["s1"] } }] },
        ] },
      ]),
      allowed,
    );
    expect(r.ok).toBe(true);
  });

  it("rejects experience blocks in the wrong place, uncited checklists and one-option choices", () => {
    const r = validateContentPage(
      page([
        { component: "Step", props: { title: "Loose step" }, children: [{ component: "Paragraph", props: { text: "x", cites: ["s1"] } }] },
        { component: "Steps", props: {}, children: [{ component: "Paragraph", props: { text: "x", cites: ["s1"] } }] },
        { component: "Checklist", props: { items: ["Done"] } },
        { component: "Choice", props: { label: "Pick" }, children: [{ component: "Option", props: { label: "Only" }, children: [{ component: "Paragraph", props: { text: "x", cites: ["s1"] } }] }] },
      ]),
      allowed,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const all = r.errors.join("\n");
      expect(all).toMatch(/Step must be directly inside Steps/);
      expect(all).toMatch(/Steps may only contain Step/);
      expect(all).toMatch(/Checklist must cite/);
      expect(all).toMatch(/Choice needs at least 2/);
    }
  });
});
