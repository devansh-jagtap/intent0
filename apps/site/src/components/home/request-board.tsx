"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/*
 * The live thing: requests to Riverton City Services (the example site in this repository), set
 * like a switchboard. Each row is a request and the line it reached: an approved task, an answer
 * from the site's pages, or nothing when no line is wired for it. The board lights one line after
 * another by itself until someone clicks a row or types their own request.
 * Matching here is simple keywords, as intent0 does without a model.
 */

type Kind = "done" | "answer" | "confirm" | "none";
interface Line {
  ask: string;
  line: string;
  result: string;
  status: [Kind, string];
  detail: [string, string][];
  words: string[];
}

const LINES: Line[] = [
  {
    ask: "I just moved in and need water",
    line: "New water connection",
    result: "WTR-2026-04101",
    status: ["done", "Received"],
    detail: [
      ["Connected to", "Apply for a new water connection"],
      ["Sent to", "The city's own API"],
    ],
    words: ["water", "connection", "moved", "move", "tap", "supply", "new", "house", "home"],
  },
  {
    ask: "There's a pothole on Elm Street",
    line: "Report a street problem",
    result: "RPT-2026-04102",
    status: ["done", "Crew assigned"],
    detail: [
      ["Connected to", "Report a problem on a street"],
      ["Also for agents", "An AI agent made this exact report"],
    ],
    words: ["pothole", "street", "road", "streetlight", "light", "graffiti", "broken", "report", "elm"],
  },
  {
    ask: "I rent. What papers do I need?",
    line: "Answer from Documents",
    result: "Owner's letter",
    status: ["answer", "Answered"],
    detail: [
      ["It said", "A signed letter from the owner"],
      ["Source", "/help/water-connection-documents"],
    ],
    words: ["rent", "renting", "tenant", "papers", "documents", "document", "landlord", "owner", "proof", "cost", "fee", "price"],
  },
  {
    ask: "A copy of my birth certificate",
    line: "Order a birth certificate",
    result: "$12 a copy",
    status: ["confirm", "Asks first"],
    detail: [
      ["First", "A code to their phone, never skipped"],
      ["Then", "They confirm before it's sent"],
    ],
    words: ["birth", "certificate", "copy", "record", "records"],
  },
  {
    ask: "Close my water account",
    line: "No line for this",
    result: "Site's own page",
    status: ["none", "Not wired"],
    detail: [
      ["What happened", "No approved task, so none is invented"],
      ["Instead", "The visitor goes to the city's page"],
    ],
    words: ["close", "cancel", "delete", "stop", "account", "remove"],
  },
];

const tokens = (s: string) => s.toLowerCase().match(/[a-z]+/g) ?? [];

/** The best line for a request by shared words; the "not wired" line when nothing matches. */
function route(text: string): number {
  const said = new Set(tokens(text));
  let best = -1;
  let score = 0;
  LINES.forEach((l, i) => {
    const s = l.words.filter((w) => said.has(w)).length;
    if (s > score) {
      score = s;
      best = i;
    }
  });
  return best >= 0 ? best : LINES.findIndex((l) => l.status[0] === "none");
}

export function RequestBoard() {
  const [open, setOpen] = useState(0);
  const [typed, setTyped] = useState("");
  const [asked, setAsked] = useState<{ text: string; line: number } | null>(null);
  const [auto, setAuto] = useState(true);
  const boardRef = useRef<HTMLDivElement>(null);

  // Light one line after another while the board is on screen, until the visitor takes over.
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = Boolean(e?.isIntersecting)), { threshold: 0.3 });
    if (boardRef.current) io.observe(boardRef.current);
    const timer = window.setInterval(() => {
      if (visible) setOpen((o) => (o + 1) % LINES.length);
    }, 3200);
    return () => {
      window.clearInterval(timer);
      io.disconnect();
    };
  }, [auto]);

  function onAsk(e: FormEvent) {
    e.preventDefault();
    const text = typed.trim();
    if (!text) return;
    setAuto(false);
    setAsked({ text, line: route(text) });
    setOpen(-1);
  }

  const rows = [
    ...(asked ? [{ key: "asked", l: LINES[asked.line]!, ask: asked.text, i: -1 }] : []),
    ...LINES.map((l, i) => ({ key: String(i), l, ask: l.ask, i })),
  ];

  return (
    <div ref={boardRef} data-ui>
      <form className="ask-row" onSubmit={onAsk} role="search">
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Try one: my streetlight is broken" aria-label="Ask Riverton City Services something" />
        <Button type="submit" className="h-[68px] bg-lamp px-8 text-ink hover:bg-[#ffa43a]">
          Connect
        </Button>
      </form>
      <div className="rows">
        {rows.map(({ key, l, ask, i }) => (
          <button
            key={key}
            type="button"
            className="row"
            aria-expanded={open === i}
            onClick={() => {
              setAuto(false);
              setOpen(i);
            }}
          >
            <span>{ask}</span>
            <span className="fact">{l.line}</span>
            <span className="fact">{l.result}</span>
            <span className={`status ${l.status[0]}`}>{l.status[1]}</span>
            <span className="row-detail">
              <span>
                {l.detail.map(([k, v]) => (
                  <span key={k}>
                    <b>{k}</b>
                    {v}
                  </span>
                ))}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
