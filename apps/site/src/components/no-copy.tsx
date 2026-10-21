"use client";

import { useEffect } from "react";

/**
 * Discourages casual copying of the site's text and media: no selecting, copying, cutting,
 * dragging or right-click menu. It can't stop screenshots or view-source; the code's
 * licence is what protects it. Copy buttons on commands and code still work, and fields
 * (the dashboard, "Ask this site") behave normally.
 */
export function NoCopy() {
  useEffect(() => {
    const isField = (t: EventTarget | null) => t instanceof Element && Boolean(t.closest("input, textarea, select, [contenteditable]"));
    const block = (e: Event) => {
      if (!isField(e.target)) e.preventDefault();
    };
    const events = ["copy", "cut", "contextmenu", "dragstart", "selectstart"] as const;
    for (const name of events) document.addEventListener(name, block);
    return () => {
      for (const name of events) document.removeEventListener(name, block);
    };
  }, []);
  return null;
}
