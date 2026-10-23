// The script-tag build: <script src="https://…/intent0.js" defer></script> on any website.
// Bundles React inside, so the site needs no framework.
import { createRoot } from "react-dom/client";
import { Intent0Layer } from "@intent0/react";

// Must be read synchronously while this script is running.
const script = document.currentScript as HTMLScriptElement | null;

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

  // The layer reads the site's look (colours, fonts, buttons) itself; data-accent can name the accent.
  if (script?.dataset.accent) host.style.setProperty("--intent0-accent", script.dataset.accent);

  createRoot(host).render(<Intent0Layer endpoint={endpoint} lang={script?.dataset.lang ?? "en"} />);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
else mount();
