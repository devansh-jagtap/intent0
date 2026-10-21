import { ChevronRight, MousePointerClick, Sparkles } from "lucide-react";

const CLICKS = ["Home", "Residents", "Utilities", "Water & sewer", "New connection", "Step 1 of 3", "Step 2 of 3", "Step 3 of 3"];

/** The usual path through a site's menus, replaced by one sentence. Loops with CSS only. */
export function Maze() {
  return (
    <div className="edge relative overflow-hidden rounded-2xl p-6 sm:p-8" aria-hidden>
      <p className="mb-5 flex items-center gap-2 font-mono text-xs tracking-widest text-faint uppercase">
        <MousePointerClick className="size-4" /> Today: 8 clicks, 3 pages
      </p>
      <div className="flex min-h-[132px] flex-wrap content-start items-center gap-2">
        {CLICKS.map((c, i) => (
          <span key={c} className="maze-step flex items-center gap-2" style={{ "--delay": `${i * 0.35}s` } as React.CSSProperties}>
            <span className="rounded-lg border border-line bg-white/5 px-3 py-1.5 text-sm text-muted">{c}</span>
            {i < CLICKS.length - 1 && <ChevronRight className="size-4 text-faint" />}
          </span>
        ))}
      </div>
      <div className="maze-answer absolute inset-0 grid place-items-center bg-panel/95 p-6">
        <div className="text-center">
          <p className="mb-3 flex items-center justify-center gap-2 font-mono text-xs tracking-widest text-cyan uppercase">
            <Sparkles className="size-4" /> With intent0: one sentence
          </p>
          <p className="text-xl font-semibold sm:text-2xl">“I need water at my new house.”</p>
        </div>
      </div>
    </div>
  );
}
