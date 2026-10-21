"use client";

import { Check, ChevronRight, CornerDownLeft, FileText, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/*
 * The hero: a city website as people use it today (eight clicks through menus to reach one
 * form), swept away into one sentence. Then intent0 builds the page and the city's own API
 * stamps it received; a question gets an answer with its source marked. Loops through three
 * requests while on screen. Illustration only; the video shows a real recording.
 */

const CLICKS = ["Home", "Residents", "Utilities", "Water & sewer", "New connection", "Step 1 of 3", "Step 2 of 3", "Step 3 of 3"];

type Field = { label: string; value: string; fromWords?: boolean };
type Scenario =
  | { kind: "task"; ask: string; task: string; fields: Field[]; button: string; stamp: string; ref: string }
  | { kind: "answer"; ask: string; heading: string; cited: string; rest: string; source: string };

const SCENARIOS: Scenario[] = [
  {
    kind: "task",
    ask: "I just moved into a new house and need water",
    task: "Apply for a new water connection",
    fields: [
      { label: "Full name", value: "Asha Rao" },
      { label: "Property address", value: "22 Cedar Lane" },
      { label: "Connection type", value: "Residential", fromWords: true },
    ],
    button: "Submit application",
    stamp: "Received",
    ref: "WTR-2026-04101",
  },
  {
    kind: "answer",
    ask: "I rent my flat. What papers do I need for water?",
    heading: "If you rent the property",
    cited: "You need a signed letter from the owner that allows you to apply, with a copy of their photo ID.",
    rest: " Bring both to your appointment or upload them in step 2.",
    source: "/help/water-connection-documents#if-you-rent",
  },
  {
    kind: "task",
    ask: "The streetlight outside 14 Elm Street is broken",
    task: "Report a problem on a street",
    fields: [
      { label: "What is the problem?", value: "Broken streetlight", fromWords: true },
      { label: "Where is it?", value: "Outside 14 Elm Street", fromWords: true },
    ],
    button: "Send report",
    stamp: "Assigned",
    ref: "RPT-2026-04103",
  },
];

type Phase = "maze" | "sweep" | "typing" | "thinking" | "building" | "done";

export function HeroDemo() {
  const [phase, setPhase] = useState<Phase>("maze");
  const [crumbs, setCrumbs] = useState(0);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [shown, setShown] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const visible = useRef(false);

  // Only animate while someone can see it.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (visible.current = Boolean(e?.isIntersecting)), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const ready = async () => {
      while (!cancelled && (!visible.current || document.hidden)) await sleep(200);
      return !cancelled;
    };
    void (async () => {
      await sleep(0);
      // Reduced motion: the first request, finished and stamped, without movement.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setTyped(SCENARIOS[0]!.ask.length);
        setShown(99);
        setPhase("done");
        return;
      }
      await sleep(450);
      for (let n = 1; n <= CLICKS.length; n++) {
        if (!(await ready())) return;
        setCrumbs(n);
        await sleep(n > 5 ? 420 : 300);
      }
      await sleep(1100);
      setPhase("sweep");
      await sleep(700);

      for (let i = 0; ; i = (i + 1) % SCENARIOS.length) {
        const s = SCENARIOS[i]!;
        setIndex(i);
        setShown(0);
        setTyped(0);
        setPhase("typing");
        for (let n = 0; n <= s.ask.length; n++) {
          if (!(await ready())) return;
          setTyped(n);
          await sleep(32);
        }
        await sleep(380);
        setPhase("thinking");
        await sleep(950);
        setPhase("building");
        const blocks = s.kind === "task" ? s.fields.length + 2 : 3;
        for (let b = 1; b <= blocks; b++) {
          if (!(await ready())) return;
          setShown(b);
          await sleep(300);
        }
        await sleep(500);
        setPhase("done");
        await sleep(3400);
        if (!(await ready())) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const s = SCENARIOS[index]!;
  const intro = phase === "maze" || phase === "sweep";
  const stamped = phase === "done" && s.kind === "task";

  const caption =
    phase === "maze"
      ? crumbs < CLICKS.length
        ? `Finding one form the usual way: ${crumbs} ${crumbs === 1 ? "click" : "clicks"}`
        : "8 clicks across 3 pages, for one form."
      : s.kind === "task"
        ? "With intent0: one sentence. The form comes from tasks the city approved."
        : "Questions are answered from the site's own pages, with the source marked.";

  return (
    <figure className="m-0">
      <div ref={stage} className={`overflow-hidden rounded-[18px] border border-rule bg-sheet shadow-[0_30px_70px_-34px_rgba(21,35,61,0.45)] ${stamped ? "thud" : ""}`} aria-hidden>
        {/* browser chrome */}
        <div className="flex h-10 items-center gap-2 border-b border-rule bg-[#f6f8fa] px-4">
          <i className="size-2.5 rounded-full bg-[#d5dbe3]" />
          <i className="size-2.5 rounded-full bg-[#d5dbe3]" />
          <i className="size-2.5 rounded-full bg-[#d5dbe3]" />
          <div className="ml-3 flex h-6 flex-1 items-center rounded-md bg-white px-3 text-[12px] text-pencil ring-1 ring-rule">riverton.example/services</div>
        </div>

        <div className="relative h-[470px] text-[#1b1f24] sm:h-[500px]">
          {/* the city's website, as it is */}
          <div className={`absolute inset-0 transition-opacity duration-500 ${intro ? "opacity-100" : "opacity-45"}`}>
            <div className="flex h-12 items-center gap-3 bg-[#1d4f91] px-5 text-white">
              <span className="grid size-7 place-items-center rounded-full bg-[#f2b632] text-sm font-black text-[#123764]">R</span>
              <span className="text-[14px] font-bold">Riverton City Services</span>
            </div>
            <div className="flex h-8 items-center gap-4 overflow-hidden bg-[#123764] px-5 text-[12px] whitespace-nowrap text-white/80">
              {["Residents", "Business", "Utilities", "Permits", "Payments", "Contact"].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 pt-[104px] sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`rounded border border-[#d7dce3] border-t-4 border-t-[#1d4f91] p-3 ${i > 3 ? "hidden sm:block" : ""}`}>
                  <span className="mb-2 block h-2.5 w-16 rounded bg-[#123764]/55" />
                  {[82, 64, 74, 52].map((w, j) => (
                    <span key={j} className="mt-1.5 block h-2 rounded bg-[#1d4f91]/25" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* the old way: one click after another */}
          {intro && (
            <div className="crumbs absolute inset-x-4 top-[100px] flex flex-wrap items-center gap-x-1.5 gap-y-2 sm:inset-x-6" data-gone={phase === "sweep" ? "" : undefined}>
              {CLICKS.slice(0, crumbs).map((c, i) => (
                <span key={c} className="crumb flex items-center gap-1.5" style={{ "--i": CLICKS.length - i } as React.CSSProperties}>
                  <span className={`crumb-in rounded-md border px-2.5 py-1 text-[13px] font-medium shadow-sm ${i === crumbs - 1 ? "border-[#1d4f91] bg-[#1d4f91] text-white" : "border-[#c9d3e0] bg-white text-[#123764]"}`}>{c}</span>
                  {i < CLICKS.length - 1 && <ChevronRight className="crumb-in size-3.5 text-[#7a8699]" />}
                </span>
              ))}
            </div>
          )}

          {/* intent0 */}
          <div
            className="panel-rise absolute inset-x-3 top-3 bottom-3 flex flex-col overflow-hidden rounded-[14px] border border-rule bg-white shadow-[0_18px_50px_-20px_rgba(16,24,40,0.45)] sm:inset-x-7 sm:top-6 sm:bottom-6"
            data-hidden={phase === "maze" ? "" : undefined}
          >
            <div className="border-b border-[#e4e7ec] p-3 sm:p-4">
              <div className="mb-2 text-[13px] font-bold">Ask this site</div>
              <div className="flex gap-2">
                <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border-[1.5px] border-[#1d4f91] px-3 text-[14px] shadow-[0_0_0_3px_rgba(29,79,145,0.12)]">
                  <Search className="size-4 shrink-0 text-[#5b6475]" />
                  <span className="truncate">{s.ask.slice(0, typed)}</span>
                  {phase === "typing" && <span className="caret -ml-1.5 h-4 w-px shrink-0 bg-[#1b1f24]" />}
                </div>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#1d4f91] text-white ${phase === "thinking" ? "pulse" : ""}`}>
                  <CornerDownLeft className="size-4" />
                </span>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden p-4 sm:p-5">
              {(phase === "typing" || phase === "sweep") && (
                <div className="text-[13px] text-[#5b6475]">
                  <p className="mb-2">Things people do here</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Report a problem", "New water connection", "Birth certificate copy", "Track a request"].map((c) => (
                      <span key={c} className="rounded-full border border-[#d9dee8] px-2.5 py-1 text-[12px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {phase === "thinking" && (
                <div className="grid gap-3">
                  <p className="text-[15px] font-bold">Building your page…</p>
                  {[88, 66, 78, 40].map((w, i) => (
                    <span key={i} className="skeleton block h-3 rounded" style={{ width: `${w}%` }} />
                  ))}
                </div>
              )}

              {(phase === "building" || phase === "done") && s.kind === "task" && (
                <div className="grid gap-3">
                  {shown >= 1 && (
                    <div className="rise flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[16px] font-bold text-[#123764]">{s.task}</p>
                      <span className="rounded-full bg-[#eef2fb] px-2 py-0.5 text-[11px] font-semibold text-[#1d4f91]">approved task</span>
                    </div>
                  )}
                  {s.fields.map(
                    (f, i) =>
                      shown >= i + 2 && (
                        <label key={f.label} className="rise grid gap-1 text-[12px] font-semibold">
                          {f.label}
                          <span className={`flex h-9 items-center justify-between gap-2 rounded-md border px-3 text-[13px] font-normal ${f.fromWords ? "border-stamp/60 bg-stamp-soft" : "border-[#c6ccd6]"}`}>
                            <span className="truncate">{f.value}</span>
                            {f.fromWords && <span className="shrink-0 text-[11px] font-semibold text-stamp">from your words</span>}
                          </span>
                        </label>
                      ),
                  )}
                  {shown >= s.fields.length + 2 && (
                    <span className={`rise flex w-fit items-center gap-2 rounded-md px-4 py-2 text-[13px] font-bold text-white ${phase === "done" ? "bg-[#1d7a4f]" : "bg-[#1d4f91]"}`}>
                      {phase === "done" ? (
                        <>
                          <Check className="size-4" /> Sent to the city&apos;s own API
                        </>
                      ) : (
                        s.button
                      )}
                    </span>
                  )}
                  {phase === "done" && (
                    <div className="absolute right-4 bottom-4 sm:right-7 sm:bottom-6">
                      <div className="stamp stamp-in">
                        <div className="text-[22px] font-black tracking-[0.08em] uppercase sm:text-[26px]">{s.stamp}</div>
                        <div className="mt-0.5 text-[12px] font-bold tabular-nums">{s.ref}</div>
                        <div className="text-[10px] font-bold tracking-[0.1em] uppercase">21 Oct 2026</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(phase === "building" || phase === "done") && s.kind === "answer" && (
                <div className="grid gap-3">
                  {shown >= 1 && (
                    <div className="rise">
                      <p className="text-[12px] text-[#5b6475]">Documents for a new water connection</p>
                      <p className="text-[16px] font-bold text-[#123764]">{s.heading}</p>
                    </div>
                  )}
                  {shown >= 2 && (
                    <p className="rise text-[14px] leading-relaxed">
                      <span className={phase === "done" ? "marker" : ""}>{s.cited}</span>
                      <sup className="ml-0.5 font-bold text-stamp">1</sup>
                      {s.rest}
                    </p>
                  )}
                  {shown >= 3 && (
                    <div className="rise flex items-start gap-2 rounded-lg border border-[#e4e7ec] bg-[#f5f7fb] p-3 text-[12px] text-[#5b6475]">
                      <FileText className="mt-0.5 size-4 shrink-0" />
                      <span className="min-w-0">
                        <b className="text-[#1b1f24]">1. Source on this site: </b>
                        <span className={`break-all ${phase === "done" ? "marker" : ""}`}>{s.source}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="border-t border-[#e4e7ec] px-4 py-2 text-[11px] text-[#5b6475]">Powered by intent0</div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 min-h-[1.6em] text-[15px] text-pencil" aria-hidden>
        {caption}
      </figcaption>
      <p className="sr-only">
        An illustration: on a city website, reaching one form takes eight clicks across three pages. With intent0 the visitor types one sentence, a form is built
        from the city&apos;s approved tasks and submitted to its API, and questions are answered from the site&apos;s pages with the source shown.
      </p>
    </figure>
  );
}
