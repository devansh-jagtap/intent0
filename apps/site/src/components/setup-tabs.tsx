"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";

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

export function SetupTabs() {
  const [active, setActive] = useState("next");
  const tab = TABS.find((t) => t.id === active)!;
  return (
    <div className="rounded-[18px] border border-rule bg-sheet">
      <div role="tablist" aria-label="Where you use intent0" className="flex gap-1 overflow-x-auto border-b border-rule px-2 pt-2 sm:px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={`-mb-px shrink-0 cursor-pointer border-b-[3px] px-4 py-3 text-[15px] font-semibold transition-colors ${t.id === active ? "border-stamp text-ink" : "border-transparent text-pencil hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" key={tab.id} className="rise grid grid-cols-[minmax(0,1fr)] gap-5 p-4 sm:p-7">
        <p className="m-0 max-w-[62ch] text-pencil">{tab.intro}</p>
        <ol className="m-0 grid list-none gap-5 p-0">
          {tab.steps.map((s, i) => (
            <li key={i} className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)] gap-x-3">
              <span className="grid size-7 place-items-center rounded-full bg-paper text-[14px] font-bold text-ink">{i + 1}</span>
              <div className="grid min-w-0 gap-2">
                <p className="m-0 pt-0.5 text-[15px]">{s.note}</p>
                <div className="relative">
                  <pre className="m-0 overflow-x-auto rounded-xl bg-night p-4 pr-14 text-[13.5px] leading-relaxed text-night-ink">{s.code}</pre>
                  <CopyButton text={s.code} className="absolute top-2.5 right-2.5" />
                </div>
              </div>
            </li>
          ))}
        </ol>
        {tab.after && <p className="m-0 max-w-[62ch] text-[15px] text-pencil">{tab.after}</p>}
      </div>
    </div>
  );
}
