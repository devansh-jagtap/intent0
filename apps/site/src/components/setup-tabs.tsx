"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type Tab = { id: string; label: string; intro: string; steps: { note: string; code: string }[]; after?: string };

const BUILD = { note: "intent0 isn't on npm yet. Build the package once from the repository:", code: "git clone https://github.com/devansh-jagtap/intent0\ncd intent0 && pnpm install && pnpm pack:intent0" };

const TABS: Tab[] = [
  {
    id: "next",
    label: "Next.js",
    intro: "App Router sites get a route and a component; your own buttons and inputs are reused.",
    steps: [
      BUILD,
      { note: "In your website's folder:", code: "npm install /path/to/intent0/packages/intent0/intent0-0.0.1.tgz\nnpx intent0 init" },
    ],
    after: "init reads your code, maps it into tasks with the model you choose, asks you to approve them, builds Site Memory and adds the bar to your root layout.",
  },
  {
    id: "any",
    label: "Any backend",
    intro: "PHP, Express, Django, Flask, Spring, ASP.NET, Go or plain HTML: intent0 runs next to your site and you add one script tag.",
    steps: [
      BUILD,
      { note: "In your website's folder:", code: "npx --package=/path/to/intent0-0.0.1.tgz intent0 init\nnpx --package=/path/to/intent0-0.0.1.tgz intent0 serve" },
      { note: "Then, before </body> on your pages:", code: '<script src="http://localhost:4100/intent0.js" defer></script>' },
    ],
    after: 'Options: data-lang="hi", data-accent="#0f766e", data-mount="#some-element".',
  },
  {
    id: "docs",
    label: "Docs sites",
    intro: "No forms? intent0 works as an information assistant: answers come only from your pages, with sources and exact code.",
    steps: [
      BUILD,
      { note: "With your site running:", code: "npx intent0 index --crawl http://localhost:3000" },
    ],
    after: "Ask \"how do I set this up with Vue\" and the page shows only the Vue guide, with its code copied exactly.",
  },
  {
    id: "agents",
    label: "AI agents",
    intro: "Agents get your public approved tasks and a site search, nothing else.",
    steps: [
      { note: "A running site answers MCP over HTTP at:", code: "https://your-site.example/intent0/mcp" },
      {
        note: "Or add intent0 to Claude Desktop, Cursor and similar apps:",
        code: '{\n  "mcpServers": {\n    "my-site": {\n      "command": "npx",\n      "args": ["intent0", "mcp", "--dir", "/path/to/your/site"]\n    }\n  }\n}',
      },
    ],
    after: "Irreversible tasks need the person's confirmation; missing details are asked for, never guessed.",
  },
];

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-md border border-line bg-panel text-muted transition hover:text-ink"
      aria-label={done ? "Copied" : "Copy"}
    >
      {done ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
    </button>
  );
}

export function SetupTabs() {
  const [active, setActive] = useState("next");
  const tab = TABS.find((t) => t.id === active)!;
  return (
    <div className="edge rounded-2xl p-2 sm:p-3">
      <div role="tablist" aria-label="Where you use intent0" className="flex gap-1 overflow-x-auto rounded-xl bg-bg/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${t.id === active ? "bg-white/10 text-ink" : "text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" key={tab.id} className="rise-in grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-5">
        <p className="text-muted">{tab.intro}</p>
        {tab.steps.map((s, i) => (
          <div key={i} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
            <p className="text-sm text-faint">
              <span className="mr-2 font-mono text-cyan">{String(i + 1).padStart(2, "0")}</span>
              {s.note}
            </p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-xl border border-line bg-[#0b0b10] p-4 pr-14 font-mono text-[13px] leading-relaxed text-[#d4d4dc]">{s.code}</pre>
              <CopyButton text={s.code} />
            </div>
          </div>
        ))}
        {tab.after && <p className="text-sm text-muted">{tab.after}</p>}
      </div>
    </div>
  );
}
