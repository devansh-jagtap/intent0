# Riverton City Services (example)

A fictional city website for trying intent0 on a site that isn't Next.js. It has the usual maze of menus, its own forms and a plain JSON backend, with no dependencies. The video on the intent0 website was recorded on it.

```bash
# from the repository root, once
pnpm install && pnpm pack:intent0

cd examples/city-services
node server.js                                  # the website: http://localhost:5050
node ../../packages/intent0/dist/cli.js serve   # intent0 next to it: http://localhost:4100
```

Open http://localhost:5050 and click **Ask this site** (or press Ctrl/⌘ K). Try:

- "The streetlight outside my house is broken"
- "I just moved into a new house and need water"
- "I need a copy of my birth certificate" (the code is always `123456`)
- "I rent my flat, what papers do I need" (an answer from the site's own pages, with sources)

Without a model key intent0 runs in keyword mode: it picks the task and builds plain step pages. Add `LLM_BASE_URL`, `LLM_MODEL` and `LLM_API_KEY` to `.env.local` here (or run `npx intent0 dashboard`) to let a model understand free-form requests and fill in details from the sentence.

| File | What it is |
|---|---|
| `server.js`, `public/` | The website itself (it knows nothing about intent0 except one `<script>` tag per page) |
| `intent0.manifest.json` | The approved tasks: water connection, street problem, birth certificate copy, tracking |
| `intent0.memory.json` | Site Memory built by `intent0 index --crawl http://localhost:5050` |

AI agents can use the same tasks: `node ../../packages/intent0/dist/cli.js mcp --dir .` (stdio) or `http://localhost:4100/intent0/mcp` (HTTP). Data is kept in memory and resets when the server restarts.
