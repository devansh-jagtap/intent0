---
title: Answers from your content
order: 4
---

# Answers from your content

Besides tasks, intent0 answers questions from your own content: docs, guides, notices and help pages. Every statement links to the page it came from, and code examples are copied exactly from your docs, never written by the model.

## Site Memory

Site Memory is the file intent0 answers from. Build it with:

```bash
npx intent0 index
```

`index` reads Markdown and MDX files in your repository, and the pages of your running website. It splits them into sections, keeps code blocks whole and records the links between pages. It needs no model.

Private areas are never read: admin, account, profile, settings, login and staff pages are skipped.

Run `index` again whenever your content changes, or use **Rebuild from the site** in the dashboard.

## Options

- `--crawl http://localhost:3000`: read the site at this address.
- `--no-crawl`: read only the files in the repository.
- `--max-pages 300`: read more pages (the default is 150).

## Documentation sites

A site with no forms works as an information assistant. Ask "how do I set this up with Vue" and the page shows only the Vue guide, with its exact code.
