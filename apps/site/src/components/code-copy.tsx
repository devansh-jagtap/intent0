"use client";

import { useEffect } from "react";

/** Adds a Copy button to every code block in the docs (the page text itself can't be copied). */
export function CodeCopy({ slug }: { slug: string }) {
  useEffect(() => {
    const buttons: HTMLButtonElement[] = [];
    for (const pre of document.querySelectorAll<HTMLPreElement>(".prose pre")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-code";
      button.textContent = "Copy";
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.querySelector("code")?.textContent ?? pre.textContent ?? "");
          button.textContent = "Copied";
          setTimeout(() => (button.textContent = "Copy"), 1600);
        } catch {
          /* clipboard unavailable */
        }
      });
      pre.append(button);
      buttons.push(button);
    }
    return () => buttons.forEach((b) => b.remove());
  }, [slug]);
  return null;
}
