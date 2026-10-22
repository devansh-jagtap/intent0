"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/* The rules intent0 enforces in code, grouped like the switchboard's own rule book, and the questions people ask. */

const GROUPS: { id: string; label: string; rules: [string, string][] }[] = [
  {
    id: "tasks",
    label: "Tasks",
    rules: [
      ["Only tasks you approved", "Nothing invented: no task, endpoint or field."],
      ["No steps skipped", "OTP and checks stay, in your order."],
      ["Final steps ask first", "Anything that can't be undone needs a yes."],
    ],
  },
  {
    id: "pages",
    label: "Pages",
    rules: [
      ["Checked before shown", "Known components and your endpoints only."],
      ["A safe way back", "If anything fails, your own page opens."],
      ["Answers cite your pages", "No source on your site, no answer."],
    ],
  },
  {
    id: "privacy",
    label: "Privacy",
    rules: [
      ["The model sees the request", "Never what people type into forms."],
      ["Your key stays on your server", "It never reaches the browser."],
      ["Private pages aren't read", "Admin, account and login pages are skipped."],
    ],
  },
];

const FAQ: [string, string][] = [
  [
    "Do I have to rebuild my website?",
    "No. intent0 is a layer on top of the site you have. Your pages, backend, validation and logins stay as they are; intent0 calls the same endpoints your forms already use.",
  ],
  [
    "Which AI models does it work with?",
    "Any OpenAI-compatible API: Groq, NVIDIA, OpenAI, Ollama on your own machine, and others. Without a model intent0 still works, with keyword matching and simple pages.",
  ],
  [
    "Can it answer questions, not just run tasks?",
    "Yes. intent0 index builds Site Memory from your docs and pages. Answers may only use those sections, and every statement is cited. Try it here: press Ask this site in the corner.",
  ],
  [
    "What about sites that aren't Next.js?",
    "intent0 serve runs next to any backend (PHP, Express, Django, Flask, Spring, ASP.NET, Go, plain HTML) and your pages add one script tag. Backends need to answer with JSON.",
  ],
  [
    "Can AI crawlers read my site?",
    "Yes. intent0 serves /llms.txt and /llms-full.txt, a plain-text version of your pages and tasks built from Site Memory, and an MCP endpoint at /intent0/mcp.",
  ],
];

const TABS = [...GROUPS.map((g) => ({ id: g.id, label: g.label })), { id: "faq", label: "Questions" }];

export function RulesBoard() {
  const [tab, setTab] = useState("tasks");
  const group = GROUPS.find((g) => g.id === tab);
  return (
    <div className="rules-layout">
      <div className="rule-tabs" role="tablist" aria-label="Rules">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="rules-panel" onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div id="rules-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {group ? (
          <div className="bands" key={tab}>
            {group.rules.map(([title, text]) => (
              <div key={title} className="band">
                <b>{title}</b>
                <p>{text}</p>
              </div>
            ))}
          </div>
        ) : (
          <Accordion className="faq">
            {FAQ.map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionContent>
                  <p className="pb-5">{a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
