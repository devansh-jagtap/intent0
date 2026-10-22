---
title: AI agents
order: 6
---

# AI agents

The tasks you approve, and search over your content, are offered to AI agents too, with the same rules as for people. Agents connect over MCP (Model Context Protocol), the standard way Claude, Cursor and other AI apps use outside tools.

There are two ways to connect:

- **Over the web:** every site with intent0 answers MCP at `/intent0/mcp`. Use this once your site is online.
- **On your computer:** `npx intent0 mcp` runs the same tools from your project folder. Use this while you build.

Agents get:

- `search_site`: search Site Memory and get cited sections.
- One tool per public, approved task. Tasks that need sign-in stay in the browser.

## Connect Claude Desktop

Takes about two minutes. You need Claude Desktop and Node.js 20 or newer.

### 1. Open the config file

In Claude Desktop, open **Settings**, then **Developer**, then **Edit Config**. This opens `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### 2. Add your site

Paste this into the file. Replace the folder with your website's folder, and the address with where your site runs:

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

If the file already has other servers, add `"my-site"` next to them inside `mcpServers`.

On Windows, if Claude can't start `npx`, use `"command": "cmd"` and put `"/c", "npx"` at the start of `args`.

### 3. Restart Claude Desktop

Quit Claude Desktop completely (from the tray or menu bar, not only the window) and open it again. Claude reads the config file only when it starts.

### 4. Check that it works

Open a new chat and look in the tools menu of the message box: `my-site` should be listed with `search_site` and your tasks. Then ask Claude something about your site, for example "Search my-site for getting started". Claude asks your permission the first time it uses a tool.

## Connect Claude Code

### 1. Add your site

For a site that is online, run this in your terminal:

```bash
claude mcp add --transport http my-site https://your-site.com/intent0/mcp
```

While you build, use your project folder instead:

```bash
claude mcp add my-site -- npx intent0 mcp --dir . --site http://localhost:3000
```

### 2. Check that it works

Run `claude mcp list` in the terminal, or type `/mcp` inside Claude Code. `my-site` should show as connected.

## Connect Cursor

Add the same `mcpServers` block to `.cursor/mcp.json` in your project, then open **Cursor Settings**, then **MCP**, and check that `my-site` is switched on.

## In the browser (WebMCP)

In browsers that support WebMCP, the Ask layer registers the same tools for agents working in the visitor's own session.

## Rules for agents

- Agents are told exactly which details are missing instead of guessing.
- Tasks that can't be undone need `confirmed: true`, which the agent sends only after asking the person.
- Required steps, such as OTP checks, can't be skipped.
