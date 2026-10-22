import { describe, expect, it } from "vitest";
import { parseHtml, parseMarkdown } from "../src/cli/index-content";
import { objectKeys } from "../src/cli/keys";
import { routeMatches } from "../src/cli/generate";

describe("Markdown indexing", () => {
  const md = [
    "---",
    "title: Prisma with Vue",
    "---",
    "import Tabs from './tabs'",
    "",
    "# Prisma with Vue",
    "Use **Prisma** in a [Vue](https://vuejs.org) app.",
    "",
    "## Install",
    "Run this in your project:",
    "",
    "```bash",
    "npm install prisma",
    "",
    "npx prisma init",
    "```",
    "",
    "## Query",
    "Call it from a server route.",
  ].join("\n");
  const draft = parseMarkdown(md, "/docs/vue", "docs/vue.md");

  it("uses the front-matter title and splits by heading", () => {
    expect(draft.title).toBe("Prisma with Vue");
    expect(draft.sections.map((s) => s.path.join(" / "))).toEqual(["Prisma with Vue", "Prisma with Vue / Install", "Prisma with Vue / Query"]);
  });

  it("keeps code blocks whole, with their language", () => {
    const install = draft.sections[1]!;
    expect(install.parts).toContainEqual({ lang: "bash", code: "npm install prisma\n\nnpx prisma init" });
  });

  it("drops MDX imports and Markdown syntax from the text", () => {
    expect(JSON.stringify(draft)).not.toContain("import Tabs");
    expect(draft.sections[0]!.parts).toContainEqual({ text: "Use Prisma in a Vue app." });
  });
});

describe("HTML indexing", () => {
  it("reads headings, text and code from the main content, skipping navigation", () => {
    const html = `<html><head><title>Docs</title></head><body><nav><a href="/x">Menu</a></nav>
      <main><h1 id="intro">Intro</h1><p>Hello <b>there</b>.</p><h2>Setup</h2><pre class="language-ts"><code>const a = 1;</code></pre>
      <a href="/docs/next">Next</a></main><footer>Footer text</footer></body></html>`;
    const d = parseHtml(html, "http://site.test/docs");
    expect(d.sections[0]).toMatchObject({ path: ["Intro"], anchor: "intro", parts: [{ text: "Hello there." }] });
    expect(d.sections[1]!.parts).toContainEqual({ lang: "ts", code: "const a = 1;" });
    expect(JSON.stringify(d)).not.toContain("Footer text");
    expect(d.links).toContain("/docs/next");
  });
});

describe("HTML cards", () => {
  it("makes each card (date, category, id, title, text) its own section", () => {
    const html = `<html><body><main><h1>Notices &amp; circulars</h1><ul>
      <li id="N-1"><div><span>Announcement</span><time>15 October 2026</time><span>N-1</span></div><h2>Extra verification slots</h2><p>Saturday counters open.</p></li>
      <li id="N-2"><div><span>Maintenance</span><time>6 October 2026</time><span>N-2</span></div><h2>Scheduled maintenance</h2><p>Services may be unavailable.</p></li>
    </ul></main></body></html>`;
    const d = parseHtml(html, "http://site.test/notices");
    const maintenance = d.sections.find((s) => s.path.at(-1) === "Scheduled maintenance");
    expect(maintenance).toMatchObject({ anchor: "N-2", parts: [{ text: "Maintenance 6 October 2026 N-2 Services may be unavailable." }] });
    // The other notice's date must not leak into this one (and vice versa).
    expect(JSON.stringify(maintenance)).not.toContain("15 October");
  });
});

describe("CLI helpers", () => {
  it("reads keys, not values, from a JSON reply object", () => {
    expect(objectKeys(" success: false, referenceId, message: form.successMessage ")).toEqual(["success", "message", "referenceId"]);
  });

  it("matches concrete and placeholder paths against dynamic routes", () => {
    expect(routeMatches("/api/applications/[service]", "/api/applications/passport")).toBe(true);
    expect(routeMatches("/api/status/[id]", "/api/status/{referenceId}")).toBe(true);
    expect(routeMatches("/api/status/[id]", "/api/status")).toBe(false);
  });
});

describe("Markdown inline code", () => {
  it("keeps inline code exactly, even when it looks like HTML", () => {
    const d = parseMarkdown("# Setup\nAdd it before `</body>` and call `search_site`.", "/docs/setup", "docs/setup.md");
    expect(d.sections[0]!.parts).toContainEqual({ text: "Add it before </body> and call search_site." });
  });
});

describe("Markdown lists and code order", () => {
  it("keeps each list item as its own line and code in its place", () => {
    const d = parseMarkdown("# Open\nIt lives here:\n- macOS: ~/Library\n- Windows: %APPDATA%\n\n```json\n{}\n```\nThen restart.", "/docs/open", "docs/open.md");
    expect(d.sections[0]!.parts).toEqual([{ text: "It lives here:" }, { text: "macOS: ~/Library" }, { text: "Windows: %APPDATA%" }, { lang: "json", code: "{}" }, { text: "Then restart." }]);
  });
});
