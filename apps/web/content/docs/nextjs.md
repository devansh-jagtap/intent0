---
title: Next.js websites
order: 2
---

# Next.js websites

On a Next.js App Router project, `npx intent0 init` adds two files and one line:

- `app/intent0/[action]/route.ts`: the server part. It holds your model key and talks to the model.
- `components/intent0-bar.tsx`: the Ask button and the generated pages.
- `<Intent0Bar />` inside `<body>` in your root layout.

## Use your own components

Pass your own buttons and inputs so generated pages look like the rest of your site:

```tsx
import { Intent0Layer } from "intent0/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Intent0Bar() {
  return <Intent0Layer endpoint="/intent0" kit={{ Button, Input }} />;
}
```

## Change the colour

intent0 uses your site's font. Set the accent colour with a CSS variable:

```css
:root {
  --intent0-accent: #0f766e;
}
```
