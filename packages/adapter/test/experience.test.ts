import { describe, expect, it } from "vitest";
import { createMemoryIndex, validateContentPage } from "@intent0/core";
import { SiteMemory, type PageNode } from "@intent0/schema";
import { expandHits, templateExperience } from "../src/experience";

const memory = SiteMemory.parse({
  memoryVersion: 1,
  builtAt: "2026-10-22T00:00:00Z",
  pages: [{ id: "p1", url: "/docs/ai-agents", title: "AI agents", source: "docs/ai-agents.md" }],
  sections: [
    { id: "s1", page: "p1", path: ["AI agents"], text: "Agents connect over MCP, the standard way Claude uses outside tools.", code: [] },
    { id: "s2", page: "p1", path: ["AI agents", "Connect Claude Desktop"], text: "Takes about two minutes. You need Node.js 20 or newer.", code: [] },
    { id: "s3", page: "p1", path: ["AI agents", "Connect Claude Desktop", "Open the config file"], text: "Open Settings, then Developer, then Edit Config.", code: [] },
    { id: "s4", page: "p1", path: ["AI agents", "Connect Claude Desktop", "Add your site"], text: "Paste this into the file:\nThen save it.", code: [{ id: "c1", lang: "json", code: "{}", after: 1 }] },
    { id: "s5", page: "p1", path: ["AI agents", "Connect Claude Desktop", "Check that it works"], text: "Open a new chat.\nLook for my-site in the tools menu.", code: [] },
    { id: "s6", page: "p1", path: ["AI agents", "Connect Claude Code", "Add your site"], text: "Run this in your terminal:", code: [{ id: "c2", lang: "bash", code: "claude mcp add my-site", after: 1 }] },
    { id: "s7", page: "p1", path: ["AI agents", "Connect Claude Code", "Check that it works"], text: "Run claude mcp list.", code: [] },
  ],
});

const find = (nodes: PageNode[], component: string): PageNode[] =>
  nodes.flatMap((n) => [...(n.component === component ? [n] : []), ...find(n.children ?? [], component)]);

describe("experiences without a model", () => {
  const hits = expandHits(createMemoryIndex(memory).search("set up mcp with claude", 6), memory);
  const page = templateExperience("set up mcp with claude", hits, [], "en");

  it("brings in every step of a how-to, even ones the search didn't match", () => {
    expect(hits.map((h) => h.section.id).sort()).toEqual(["s1", "s2", "s3", "s4", "s5", "s6", "s7"]);
  });

  it("turns two how-tos into a choice of guided steps, in the docs' order, with code in place", () => {
    const [choice] = find(page.blocks, "Choice");
    expect(choice?.children?.map((o) => o.props.label)).toEqual(expect.arrayContaining(["Connect Claude Desktop", "Connect Claude Code"]));
    const desktop = choice!.children!.find((o) => o.props.label === "Connect Claude Desktop")!;
    expect(find([desktop], "Step").map((s) => s.props.title)).toEqual(["Open the config file", "Add your site", "Check that it works"]);
    const add = find([desktop], "Step")[1]!;
    expect(add.children!.map((c) => c.component)).toEqual(["Paragraph", "CodeBlock", "Paragraph"]);
    expect(find([desktop], "Checklist")[0]?.props.items).toEqual(["Open a new chat.", "Look for my-site in the tools menu."]);
    expect(find([desktop], "Facts")[0]?.props.items).toEqual(["Takes about two minutes.", "You need Node.js 20 or newer."]);
  });

  it("passes the same checks as a model-written page", () => {
    const ids = hits.map((h) => h.section.id);
    const allowed = { sectionIds: new Set(ids), codeIds: new Set(hits.flatMap((h) => h.section.code.map((c) => c.id))), flowIds: new Set<string>() };
    const r = validateContentPage(page, allowed);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });
});
