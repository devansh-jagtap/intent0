---
title: AI agents
order: 6
---

# AI agents

The tasks you approve, and search over your content, are offered to AI agents too, with the same rules as for people.

## Desktop agents (MCP)

Add your site to Claude Desktop, Cursor or any MCP client:

```json
{
  "mcpServers": {
    "my-site": {
      "command": "npx",
      "args": ["intent0", "mcp", "--dir", "C:/path/to/your/site", "--site", "http://localhost:3000"]
    }
  }
}
```

Agents get:

- `search_site`: search Site Memory and get cited sections.
- One tool per public, approved task. Tasks that need sign-in stay in the browser.

## In the browser (WebMCP)

In browsers that support WebMCP, the Ask layer registers the same tools for agents working in the visitor's own session.

## Rules for agents

- Agents are told exactly which details are missing instead of guessing.
- Tasks that can't be undone need `confirmed: true`, which the agent sends only after asking the person.
- Required steps, such as OTP checks, can't be skipped.
