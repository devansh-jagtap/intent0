# intent0 website

intent0's own website (Next.js App Router, Tailwind CSS 4), running on intent0 itself.

- `/`: the landing page: animated hero demo, the product video, how it works, tasks and answers, AI agents, the dashboard, rules, setup tabs and FAQ.
- `/docs/*`: the docs, from `content/docs/*.md` (front matter `title` and `order`).
- `/dashboard`: connects in the browser to `npx intent0 dashboard` on the company's own computer (the link it prints carries the address and a one-time token). Nothing is stored here.
- "Ask this site" (bottom right) answers from the docs: `intent0.manifest.json` (no tasks) + `intent0.memory.json` (Site Memory), served by `src/app/intent0/[action]/route.ts`. Copy `.env.example` to `.env.local` to give it a model; without one it answers from the docs with simple pages.

```bash
pnpm --filter @intent0/site dev     # http://localhost:3000
pnpm --filter @intent0/site build
```

- `public/media/`: the product video (`intent0.mp4`, `intent0.webm`), its poster and the dashboard screenshot. `video/` has the scripts that made the video.
- Text, images and video can't be selected, copied or dragged (`src/components/no-copy.tsx` + `user-select: none`); commands and docs code keep their copy buttons, and form fields work normally. This only discourages casual copying; the repository licence is what protects the content.

## Deploying (Vercel)

Import the repository, set **Root Directory** to `apps/site` (framework: Next.js; pnpm is detected from the lockfile), and set `NEXT_PUBLIC_SITE_URL` to the live address so link previews use the right image URL. Set `INTENT0_WEBSITE` to the live address on machines running `intent0 dashboard` so its printed link opens this site's Dashboard page.
