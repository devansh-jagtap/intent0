# intent0

**Make your website intent-driven.** Visitors and AI agents say what they want; intent0 builds the right page from the tasks you approved and sends it to your own APIs.

[![Watch the 1-minute video](apps/site/public/media/poster.jpg)](apps/site/public/media/intent0.mp4)

_A real recording on [Riverton City Services](examples/city-services), the fictional example site in this repository ([MP4](apps/site/public/media/intent0.mp4))._

- **Tasks**: guided step pages for things the site can do (apply, register, book, report, track), submitted to the site's own APIs, using only tasks the company approved.
- **Answers**: questions answered from the site's own content (docs, guides, help pages), with every statement cited and every code example copied exactly.
- **AI agents**: the same approved tasks and content search as tools, over MCP (HTTP or stdio) and WebMCP in the browser.

Visitors press the **Ask this site** button in the bottom-right corner (or Ctrl/⌘ K) and type or speak what they want. While the page is built they see "Generating your experience"; then the generated page fills the screen over the site. Following a source link closes it and shows that spot on the real page.

## How it works

1. **Read your code.** `intent0 init` scans your routes and forms and, with the model you choose, maps them into user tasks: fields, order, and the endpoint each step calls.
2. **Approve the tasks.** You review them in the terminal or with `intent0 dashboard`. Only approved, enabled tasks are ever offered.
3. **Visitors say what they want.** intent0 picks the matching task or answers from Site Memory.
4. **The right page, sent to your API.** Step pages are built live, checked before they're shown, and submitted to your own endpoints. If anything fails, the visitor lands on your original page.

## Commands

| Command | What it does |
|---|---|
| `intent0 init` | Reads your code, maps it into tasks (with your chosen model), asks you to approve them, builds Site Memory from your content, and adds the intent bar |
| `intent0 dashboard` | A page on your own computer to turn tasks on/off, fix wording and endpoints, approve a new revision, rebuild Site Memory, change the model, see what agents get and try a request |
| `intent0 index` | Rebuilds Site Memory (`intent0.memory.json`) from your Markdown/MDX docs and your running site's pages |
| `intent0 approve` | Checks `intent0.manifest.json` after you edit it and marks it approved |
| `intent0 serve` | The intent0 server for sites that aren't Next.js (port 4100); add `<script src="http://localhost:4100/intent0.js" defer></script>` to your pages |
| `intent0 mcp` | Offers your site's public approved tasks and `search_site` to AI agents such as Claude Desktop or Cursor over stdio (`--dir <project>`, `--site <url>`) |

What intent0 writes into your project:

- `intent0.manifest.json`: the approved tasks (review it; only approved, enabled tasks are ever offered).
- `intent0.memory.json`: Site Memory, your content split into sections with page links, topics and exact code blocks. Built without any model.
- `.env.local`: your model settings and key (never sent to the browser or committed). Settings already in `.env` are used too.
- Next.js only: `app/intent0/[action]/route.ts` and `components/intent0-bar.tsx`, added to your root layout.

## Try it

intent0 isn't published to npm yet. Build the package once in this repository:

```bash
pnpm install
pnpm pack:intent0        # creates packages/intent0/intent0-0.0.1.tgz
```

The quickest way to see it is the example site, which needs no model key:

```bash
cd examples/city-services
node server.js                                  # http://localhost:5050
node ../../packages/intent0/dist/cli.js serve   # intent0 next to it
```

### Next.js (App Router) websites

```bash
# in your website's folder
npm install /path/to/intent0/packages/intent0/intent0-0.0.1.tgz
npx intent0 init
```

### Any other website (PHP, Express, Django/Flask, Spring, ASP.NET, Go, plain HTML…)

```bash
# in your website's folder
npx --package=/path/to/intent0-0.0.1.tgz intent0 init
npx --package=/path/to/intent0-0.0.1.tgz intent0 serve
```

Then add the script tag to your pages (or shared layout/footer), before `</body>`. Options: `data-lang="hi"`, `data-accent="#0f766e"`, `data-mount="#some-element"`. Your backend needs to answer with JSON.

### Docs/content sites

A site with no forms (for example, a documentation site) works as an information assistant: `init` finds no tasks and only builds Site Memory. Ask "how do I set this up with Vue" and the page shows only the Vue guide, with its exact code.

### AI agents (Claude Desktop, Cursor, …)

A running site answers MCP over HTTP at `/intent0/mcp` (Next.js route or `intent0 serve`). When you deploy, set `INTENT0_SITE_URL` to the site's live address so agents' task calls go there.

For desktop agents that start their own servers, add intent0 to the agent's config:

```json
{
  "mcpServers": {
    "my-site": {
      "command": "npx",
      "args": ["intent0", "mcp", "--dir", "/path/to/your/site", "--site", "http://localhost:3000"]
    }
  }
}
```

Agents get only public approved tasks (sign-in tasks stay in the browser), must send `confirmed: true` for irreversible ones after asking the person, and are told exactly which details are missing instead of guessing.

## Rules intent0 always follows

- Only approved, enabled tasks; destructive ones (delete, cancel) are disabled by default.
- Required steps (OTP, verification) can't be skipped; irreversible submits need explicit confirmation.
- Generated pages are checked before they're shown: known components only, real endpoints only, cited content only, code only from the site's docs.
- If anything fails, the visitor goes to the site's own page for that task.
- The model sees the visitor's request, never their form data. Details remembered for pre-filling stay in that browser tab.

## Repository layout

| Path | What it is |
|---|---|
| `packages/schema` | File formats (Zod): manifest, flows, pages, information pages, Site Memory |
| `packages/core` | Deterministic logic: page and content validation, flow runner, search, agent tools, MCP server |
| `packages/adapter` | Server part: intent understanding, page generation, information answers, search, MCP over HTTP |
| `packages/react` | The intent bar and sheet (React), WebMCP tools |
| `packages/intent0` | The installable package: CLI (incl. dashboard), `intent0/server`, `intent0/react`, script-tag build |
| `apps/site` | The intent0 website (Next.js): landing page, product video and its source, docs (`content/docs/*.md`), the Dashboard page that connects to `intent0 dashboard`, and "Ask this site" running on intent0 itself |
| `examples/city-services` | Riverton City Services: a fictional city website for trying intent0 without Next.js |

## Development

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm check                              # typecheck + tests for every package
pnpm --filter @intent0/site dev         # the website (with docs and dashboard) on http://localhost:3000
```

## Licence

Copyright © 2026 Devansh Jagtap. All rights reserved. The source is public to read; it may not be copied, modified or redistributed without written permission. See [LICENSE](LICENSE).
