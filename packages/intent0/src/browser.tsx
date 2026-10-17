// The script-tag build: <script src="https://…/intent0.js" defer></script> on any website.
// Bundles React inside, so the site needs no framework.
import { createRoot } from "react-dom/client";
import { Intent0Layer } from "@intent0/react";

// Must be read synchronously while this script is running.
const script = document.currentScript as HTMLScriptElement | null;

function rgb(color: string): [number, number, number, number] | null {
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(color);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null;
}

/** A colour that looks like the site's brand: no transparent, near-white or near-black. */
function usable(color: string): boolean {
  const c = rgb(color);
  if (!c || c[3] < 0.5) return false;
  const [r, g, b] = c;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return !(min > 225 || max < 40);
}

/** Follow the site's look: take the accent from its own buttons, else its links. */
function siteAccent(): string | undefined {
  const candidates = document.querySelectorAll<HTMLElement>("button, [type=submit], .btn, .button, a[href]");
  for (const el of candidates) {
    if (el.closest("[data-intent0]")) continue;
    const bg = getComputedStyle(el).backgroundColor;
    if (el.tagName !== "A" && usable(bg)) return bg;
  }
  for (const el of document.querySelectorAll<HTMLElement>("a[href]")) {
    const fg = getComputedStyle(el).color;
    if (usable(fg)) return fg;
  }
  return undefined;
}

function mount() {
  if (document.querySelector("[data-intent0]")) return;
  const src = script?.src ? new URL(script.src, window.location.href) : null;
  // By default the intent0 server is wherever this script was loaded from.
  const endpoint = script?.dataset.endpoint ?? (src ? `${src.origin}/intent0` : "/intent0");
  const host = document.createElement("div");
  host.setAttribute("data-intent0", "");
  const target = script?.dataset.mount ? document.querySelector(script.dataset.mount) : null;
  if (target) target.appendChild(host);
  else document.body.prepend(host);

  const accent = script?.dataset.accent ?? siteAccent();
  if (accent) host.style.setProperty("--intent0-accent", accent);

  createRoot(host).render(<Intent0Layer endpoint={endpoint} lang={script?.dataset.lang ?? "en"} />);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
else mount();
