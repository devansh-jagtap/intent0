# intent0 website

The marketing site for intent0 (Next.js App Router, Tailwind CSS 4). One page: hero with an animated demo, the problem, the product video, how it works, tasks and answers, AI agents, the dashboard, rules, setup tabs and FAQ.

```bash
pnpm --filter @intent0/site dev     # http://localhost:3000
pnpm --filter @intent0/site build
```

- `public/media/`: the product video (`intent0.mp4`, `intent0.webm`), its poster and the dashboard screenshot. `video/` has the scripts that made the video.
- Text, images and video can't be selected, copied or dragged (`src/components/no-copy.tsx` + `user-select: none`); install commands keep their copy buttons. This only discourages casual copying; the repository licence is what protects the content.

## Deploying (Vercel)

Import the repository, set **Root Directory** to `apps/site` (framework: Next.js; pnpm is detected from the lockfile), and set `NEXT_PUBLIC_SITE_URL` to the live address so link previews use the right image URL.
