---
title: Other websites
order: 3
---

# Other websites

For PHP, Express, Django, Flask, Spring, ASP.NET, Go or plain HTML sites, intent0 runs as a small server next to your website, and your pages load one script.

## Set it up

```bash
npx intent0 init
npx intent0 serve
```

`serve` runs on port 4100. It holds your model key and only answers requests from your website's own address.

## Add the script tag

Add this to your shared layout or footer, before `</body>`:

```html
<script src="http://localhost:4100/intent0.js" defer></script>
```

## Options

- `data-lang="hi"`: answers in Hindi, and voice input listens for Hindi.
- `data-accent="#0f766e"`: the accent colour. By default intent0 picks it up from your buttons and links.
- `data-mount="#some-element"`: where to add intent0 in the page.

To allow more website addresses, start the server with `--origin`:

```bash
npx intent0 serve --origin https://www.example.com
```
