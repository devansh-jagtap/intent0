"use client";

import { useEffect } from "react";

/**
 * Discourages casual copying of the site's text and media: no selecting, copying, cutting,
 * dragging or right-click menu. It can't stop screenshots or view-source; the code's
 * licence is what protects it. The copy buttons on install commands still work.
 */
export function NoCopy() {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const events = ["copy", "cut", "contextmenu", "dragstart", "selectstart"] as const;
    for (const name of events) document.addEventListener(name, block);
    return () => {
      for (const name of events) document.removeEventListener(name, block);
    };
  }, []);
  return null;
}
