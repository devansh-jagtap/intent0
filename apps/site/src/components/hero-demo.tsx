"use client";

import { Check, CornerDownLeft, FileText, Search } from "lucide-react";
import { useEffect, useState } from "react";

/*
 * An animated illustration of the intent bar on a city website: a request is typed,
 * intent0 picks a task (or finds an answer) and the page builds itself. It loops through
 * three requests. Illustration only; the video shows a real recording.
 */

type Field = { label: string; value: string; filled?: boolean };
type Scenario =
  | { kind: "task"; ask: string; task: string; fields: Field[]; button: string; done: string }
  | { kind: "answer"; ask: string; heading: string; text: string; source: string };

const SCENARIOS: Scenario[] = [
  {
    kind: "task",
    ask: "The streetlight outside my house is broken",
    task: "Report a problem on a street",
    fields: [
      { label: "What is the problem?", value: "Broken streetlight", filled: true },
      { label: "Where is it?", value: "Outside 14 Elm Street" },
    ],
    button: "Send report",
    done: "RPT-2026-04103 · assigned to a crew",
  },
  {
    kind: "answer",
    ask: "I rent my flat. What papers do I need for water?",
    heading: "Documents for a new water connection › If you rent",
    text: "The property owner must apply, or you need a signed letter from the owner that allows you to apply on their behalf, with a copy of their photo ID.",
    source: "/help/water-connection-documents",
  },
  {
    kind: "task",
    ask: "I just moved into a new house and need water",
    task: "Apply for a new water connection",
    fields: [
      { label: "Full name", value: "Asha Rao" },
      { label: "Property address", value: "22 Cedar Lane" },
      { label: "Connection type", value: "Residential", filled: true },
    ],
    button: "Submit application",
    done: "WTR-2026-04101 · received",
  },
];

type Phase = "typing" | "thinking" | "building" | "done";

export function HeroDemo() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await sleep(0);
      // Reduced motion: show the first request finished, without animating.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setTyped(SCENARIOS[0]!.ask.length);
        setPhase("done");
        setShown(9);
        return;
      }
      for (let i = 0; !cancelled; i = (i + 1) % SCENARIOS.length) {
        const s = SCENARIOS[i]!;
        setIndex(i);
        setPhase("typing");
        setShown(0);
        for (let n = 0; n <= s.ask.length && !cancelled; n++) {
          setTyped(n);
          await sleep(38);
        }
        await sleep(350);
        if (cancelled) return;
        setPhase("thinking");
        await sleep(900);
        setPhase("building");
        const blocks = s.kind === "task" ? s.fields.length + 2 : 3;
        for (let b = 1; b <= blocks && !cancelled; b++) {
          setShown(b);
          await sleep(320);
        }
        await sleep(700);
        if (cancelled) return;
        setPhase("done");
        await sleep(2600);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const s = SCENARIOS[index]!;

  return (
    <div className="edge relative overflow-hidden rounded-2xl shadow-[0_50px_120px_-30px_rgba(0,0,0,0.85)]" aria-hidden>
      {/* browser chrome */}
      <div className="flex h-10 items-center gap-2 bg-[#15151d] px-4">
        <i className="size-2.5 rounded-full bg-[#3a3a46]" />
        <i className="size-2.5 rounded-full bg-[#3a3a46]" />
        <i className="size-2.5 rounded-full bg-[#3a3a46]" />
        <div className="ml-3 flex h-6 flex-1 items-center rounded-md bg-[#22222b] px-3 font-mono text-[11px] text-[#a7a8b6]">
          riverton.example/services
        </div>
      </div>

      <div className="relative h-[440px] bg-white text-[#1b1f24] sm:h-[460px]">
        {/* the city website underneath, dimmed */}
        <div className="absolute inset-0 opacity-60">
          <div className="flex h-12 items-center gap-3 bg-[#1d4f91] px-5">
            <span className="grid size-7 place-items-center rounded-full bg-[#f2b632] font-serif text-sm font-bold text-[#123764]">R</span>
            <span className="h-2.5 w-28 rounded bg-white/70" />
          </div>
          <div className="flex h-8 items-center gap-5 bg-[#123764] px-5">
            {[52, 70, 46, 54, 34].map((w, i) => (
              <span key={i} className="h-2 rounded bg-white/50" style={{ width: w }} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded border border-[#d7dce3] border-t-4 border-t-[#1d4f91] p-3">
                <span className="mb-2 block h-2.5 w-16 rounded bg-[#123764]/60" />
                {[80, 64, 72, 56].map((w, j) => (
                  <span key={j} className="mt-1.5 block h-2 rounded bg-[#1d4f91]/30" style={{ width: `${w}%` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-[#101828]/30" />

        {/* the intent0 panel */}
        <div className="absolute inset-x-4 top-4 bottom-4 flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:inset-x-8">
          <div className="border-b border-[#e4e7ec] p-3 sm:p-4">
            <div className="mb-2 text-[13px] font-semibold">Ask this site</div>
            <div className="flex gap-2">
              <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#f2b632] px-3 text-[13px] shadow-[0_0_0_3px_rgba(242,182,50,0.18)] sm:text-sm">
                <Search className="size-4 shrink-0 text-[#5b6475]" />
                <span className="truncate">{s.ask.slice(0, typed)}</span>
                {phase === "typing" && <span className="caret -ml-1.5 h-4 w-px bg-[#1b1f24]" />}
              </div>
              <span className={`grid h-10 place-items-center rounded-lg bg-[#1d4f91] px-3 text-white transition ${phase === "thinking" ? "pulse-ring" : ""}`}>
                <CornerDownLeft className="size-4" />
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-4 sm:p-5">
            {phase === "typing" && (
              <div className="text-[13px] text-[#5b6475]">
                <p className="mb-2">Things you can do here</p>
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
                <p className="text-[15px] font-semibold">Building your page…</p>
                {[90, 70, 80].map((w, i) => (
                  <span key={i} className="shimmer block h-3 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}

            {(phase === "building" || phase === "done") && s.kind === "task" && (
              <div className="grid gap-3">
                {shown >= 1 && (
                  <div className="rise-in flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-[#123764] sm:text-base">{s.task}</p>
                    <span className="rounded-full bg-[#eef2fb] px-2 py-0.5 text-[11px] text-[#1d4f91]">approved task</span>
                  </div>
                )}
                {s.fields.map(
                  (f, i) =>
                    shown >= i + 2 && (
                      <label key={f.label} className="rise-in grid gap-1 text-[12px] font-medium">
                        {f.label}
                        <span className={`flex h-9 items-center justify-between rounded-md border px-3 text-[13px] ${f.filled ? "border-[#7c5cff] bg-[#f6f3ff]" : "border-[#c6ccd6]"}`}>
                          {f.value}
                          {f.filled && <span className="text-[11px] font-medium text-[#6d4aff]">from your words</span>}
                        </span>
                      </label>
                    ),
                )}
                {shown >= s.fields.length + 2 &&
                  (phase === "done" ? (
                    <div className="rise-in flex items-center gap-3 rounded-lg border border-[#9fd3ad] bg-[#e6f4ea] p-3 text-[13px]">
                      <span className="grid size-7 place-items-center rounded-full bg-[#1d7a4f] text-white">
                        <Check className="size-4" />
                      </span>
                      <span>
                        <b className="block">Done. Sent to the city&apos;s own API.</b>
                        <span className="font-mono text-[12px]">{s.done}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="rise-in w-fit rounded-md bg-[#1d4f91] px-4 py-2 text-[13px] font-semibold text-white">{s.button}</span>
                  ))}
              </div>
            )}

            {(phase === "building" || phase === "done") && s.kind === "answer" && (
              <div className="grid gap-3">
                {shown >= 1 && <p className="rise-in text-[15px] font-semibold text-[#123764] sm:text-base">{s.heading}</p>}
                {shown >= 2 && (
                  <p className="rise-in text-[13px] leading-relaxed sm:text-sm">
                    {s.text}
                    <sup className="ml-0.5 font-semibold text-[#c48a00]">[1]</sup>
                  </p>
                )}
                {shown >= 3 && (
                  <div className="rise-in flex items-center gap-2 rounded-lg border border-[#e4e7ec] bg-[#f5f7fb] p-2.5 text-[12px] text-[#5b6475]">
                    <FileText className="size-4 shrink-0" />
                    <span>
                      <b className="text-[#1b1f24]">[1] Source on this site:</b> {s.source}
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
  );
}
