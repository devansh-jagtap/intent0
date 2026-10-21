---
title: Getting started
order: 1
---

# Getting started

intent0 adds an intent layer to a website you already have. Visitors press **Ask this site** in the bottom-right corner, type or say what they want, and get a page built for that request: a guided form for a task, or an answer from your own content with its sources.

Nothing about your website changes. intent0 reads your code once, writes down the tasks it found, and only offers the tasks you approve.

## What you need

- A website with a backend (Next.js, Express, Laravel, Django, Flask, Spring, ASP.NET, Go or plain PHP), or a documentation site.
- Node.js 20 or newer on the computer where you run the commands.
- A model you choose and pay for yourself: a free Groq or NVIDIA key works, and so does a local Ollama model.

## Set it up

Run this in your website's folder:

```bash
npx intent0 init
```

`init` does five things:

1. Reads your routes, forms and API handlers.
2. Asks which model to use and saves the key to `.env.local` on your server.
3. Maps your site into user tasks, such as "apply for a passport" or "track my application".
4. Shows you the tasks and asks you to approve them.
5. Builds Site Memory from your docs and pages, then adds the Ask button.

Start your site and press **Ask this site** in the bottom-right corner, or Ctrl K.

## Files intent0 adds

- `intent0.manifest.json`: the approved tasks. Only tasks that are approved and switched on are ever offered.
- `intent0.memory.json`: Site Memory, your content split into sections with links and exact code blocks.
- `.env.local`: your model settings and key. Never sent to the browser.
