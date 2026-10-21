"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copies a command or code block. The rest of the site's text can't be copied. */
export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
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
      className={`grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-night-2 text-night-ink transition hover:bg-[#2d4064] ${className}`}
      aria-label={done ? "Copied" : "Copy"}
    >
      {done ? <Check className="size-4 text-[#7fdcab]" /> : <Copy className="size-4" />}
    </button>
  );
}
