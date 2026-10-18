/**
 * The layer's own CSS, injected once. Prefixed with i0- so it can't clash with the
 * site's styles, and it doesn't depend on the site using Tailwind.
 * It speaks in the host site's voice: the site's font, and its accent colour
 * (the script tag picks it up; sites can also set --intent0-accent).
 */
export const INTENT0_CSS = `
.i0-layer{--i0-accent:var(--intent0-accent,#2f4fa8);--i0-ink:#1c2433;--i0-muted:#5b6475;--i0-line:#d9dee8;--i0-paper:#ffffff;--i0-wash:#f5f7fb;--i0-ok:#1d7a4f;--i0-warn:#9a5b00;--i0-bad:#b42318;
  font:inherit;font-size:15px;line-height:1.5;color:var(--i0-ink);text-align:left}
.i0-layer[data-theme=dark]{--i0-ink:#e6e9f0;--i0-muted:#9aa3b5;--i0-line:#2e3647;--i0-paper:#151a24;--i0-wash:#1c2230;--i0-ok:#5cc59a;--i0-warn:#e0a84f;--i0-bad:#f08a80}
.i0-layer *{box-sizing:border-box}
/* Shield against the site's global element styles (e.g. input{width:100%}, label{display:block}). */
.i0-layer input[type=checkbox]{width:auto;min-height:0;padding:0;margin:0;flex:none;accent-color:var(--i0-accent)}
.i0-layer label.i0-confirm,.i0-layer label.i0-check{display:flex;margin:0}
.i0-layer label.i0-label{display:block;margin:0}
.i0-layer p,.i0-layer h2,.i0-layer h3,.i0-layer ul,.i0-layer ol,.i0-layer pre{margin:0}
.i0-layer :focus-visible{outline:2px solid var(--i0-accent);outline-offset:2px}

/* The launcher: a button in the bottom-right corner */
.i0-launch{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;align-items:center;gap:8px;
  padding:12px 18px;border:0;border-radius:999px;background:var(--i0-accent);color:#fff;font:inherit;font-size:15px;font-weight:650;cursor:pointer;
  box-shadow:0 0 0 1px rgba(255,255,255,.55),0 10px 28px -8px rgba(16,24,40,.5)}
.i0-launch:focus-visible{outline:2px solid var(--i0-accent);outline-offset:3px}
.i0-launch-dot{position:absolute;top:4px;right:6px;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px var(--i0-accent)}

/* Before asking: a compact bar above the button. After asking: the whole screen becomes the generated page. */
.i0-scrim{position:fixed;inset:0;z-index:2147483001;background:rgba(16,24,40,.32)}
.i0-panel{position:fixed;right:20px;bottom:20px;z-index:2147483002;width:min(460px,calc(100vw - 32px));max-height:min(560px,calc(100vh - 40px));display:flex;flex-direction:column;
  background:var(--i0-paper);border:1px solid var(--i0-line);border-radius:16px;overflow:hidden;box-shadow:0 24px 56px -20px rgba(16,24,40,.5)}
.i0-panel[data-wide]{inset:0;width:auto;max-height:none;border:0;border-radius:0}
.i0-panel[data-wide] .i0-bar,.i0-panel[data-wide] .i0-panel-head,.i0-panel[data-wide] .i0-sheet,.i0-panel[data-wide] .i0-foot{width:100%;max-width:1080px;margin-inline:auto}
@media (max-width:640px){.i0-panel{right:16px;bottom:16px}.i0-launch{right:16px;bottom:16px}}
@media (prefers-reduced-motion:no-preference){
  .i0-scrim{animation:i0-fade .2s ease}
  .i0-panel{animation:i0-rise .24s cubic-bezier(.2,.8,.2,1)}
  .i0-skel span{animation:i0-pulse 1.4s ease-in-out infinite}
}
@keyframes i0-fade{from{opacity:0}}
@keyframes i0-rise{from{transform:translateY(16px);opacity:0}}

/* Generating your experience */
.i0-gen{display:grid;gap:14px;padding:32px 0 12px;max-width:640px}
.i0-gen-title{font-size:26px;font-weight:700;letter-spacing:-.015em;line-height:1.2}
.i0-skel{display:grid;gap:12px;margin-top:12px}
.i0-skel span{display:block;height:14px;border-radius:8px;background:var(--i0-wash);border:1px solid var(--i0-line)}
.i0-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px 0 20px}
.i0-panel-title{font-size:15px;font-weight:650;min-width:0;overflow-wrap:anywhere}
.i0-x{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:8px;background:none;color:var(--i0-muted);cursor:pointer}
.i0-x:hover{background:var(--i0-wash);color:var(--i0-ink)}
.i0-bar{padding:12px 20px 14px;border-bottom:1px solid var(--i0-line)}
.i0-row{display:flex;gap:8px;align-items:center}
.i0-intent{flex:1;min-width:0;width:100%;height:44px;border:1px solid var(--i0-line);border-radius:10px;padding:0 14px;font:inherit;font-size:15px;background:var(--i0-paper);color:var(--i0-ink)}
.i0-intent::placeholder{color:var(--i0-muted)}
.i0-intent:focus{outline:none;border-color:var(--i0-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--i0-accent) 18%,transparent)}
.i0-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.i0-idle{padding:18px 20px;display:grid;gap:10px;font-size:14px}
.i0-suggest{display:flex;flex-wrap:wrap;gap:6px}
.i0-chip{border:1px solid var(--i0-line);background:var(--i0-paper);color:var(--i0-ink);border-radius:999px;padding:5px 12px;cursor:pointer;font:inherit;font-size:13px;text-align:left}
.i0-chip:hover{border-color:var(--i0-accent);color:var(--i0-accent)}

/* The answer inside the panel */
.i0-asked{display:flex;justify-content:space-between;gap:16px;align-items:baseline;padding:12px 20px;border-bottom:1px solid var(--i0-line);background:var(--i0-wash)}
.i0-asked-text{font-size:14px;color:var(--i0-muted);min-width:0;overflow-wrap:anywhere}
.i0-asked-text q{color:var(--i0-ink)}
.i0-body{display:grid;grid-template-columns:190px 1fr;min-height:120px}
.i0-body[data-rail=none]{grid-template-columns:1fr}
.i0-rail{border-right:1px solid var(--i0-line);padding:16px 14px 16px 20px;font-size:13px;color:var(--i0-muted)}
.i0-main{padding:18px 20px 24px;min-width:0;display:grid;gap:16px;align-content:start}
.i0-foot{display:flex;justify-content:space-between;gap:12px;padding:10px 20px;border-top:1px solid var(--i0-line);font-size:12px;color:var(--i0-muted)}
@media (max-width:640px){.i0-body{grid-template-columns:1fr}.i0-rail{border-right:0;border-bottom:1px solid var(--i0-line)}.i0-steps{flex-direction:row;flex-wrap:wrap}}

/* Rail: steps and sources */
.i0-steps,.i0-sources{list-style:none;padding:0;display:flex;flex-direction:column;gap:8px}
.i0-step{display:flex;gap:8px;align-items:baseline}
.i0-step-n{flex:none;width:20px;height:20px;border-radius:50%;display:inline-grid;place-items:center;font-size:11px;border:1px solid var(--i0-line);color:var(--i0-muted)}
.i0-step[data-state=current]{color:var(--i0-ink);font-weight:600}
.i0-step[data-state=current] .i0-step-n{background:var(--i0-accent);border-color:var(--i0-accent);color:#fff}
.i0-step[data-state=done] .i0-step-n{background:var(--i0-ok);border-color:var(--i0-ok);color:#fff}
.i0-sources a{color:var(--i0-ink);text-decoration:none;display:block}
.i0-sources a:hover span{text-decoration:underline}
.i0-sources small{display:block;color:var(--i0-muted)}
.i0-src-n{color:var(--i0-accent);font-weight:600;margin-right:6px}

/* Generic text */
.i0-title{font-size:21px;line-height:1.25;font-weight:650;letter-spacing:-.01em}
.i0-h3{font-size:17px;font-weight:600}
.i0-text{font-size:15px;color:var(--i0-ink);max-width:68ch}
.i0-muted{color:var(--i0-muted)}
.i0-link{background:none;border:0;padding:0;font:inherit;font-size:13px;color:var(--i0-muted);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.i0-link:hover{color:var(--i0-ink)}
.i0-alert{font-size:14px;border:1px solid color-mix(in srgb,var(--i0-bad) 40%,transparent);background:color-mix(in srgb,var(--i0-bad) 8%,var(--i0-paper));color:var(--i0-bad);border-radius:8px;padding:10px 12px}
.i0-thinking{display:flex;gap:10px;align-items:center;font-size:14px;color:var(--i0-muted)}
.i0-dot{width:8px;height:8px;border-radius:50%;background:var(--i0-accent)}
@media (prefers-reduced-motion:no-preference){.i0-dot{animation:i0-pulse 1s ease-in-out infinite}}
@keyframes i0-pulse{50%{opacity:.3}}

/* Forms */
.i0-form,.i0-page,.i0-group{display:grid;gap:16px}
.i0-group{border:0;padding:0;margin:0;min-width:0}
.i0-legend{font-size:14px;font-weight:600;margin-bottom:4px;padding:0}
.i0-field{display:grid;gap:6px}
.i0-label{font-size:14px;font-weight:550}
.i0-req{color:var(--i0-bad)}
.i0-help{font-size:13px;color:var(--i0-muted)}
.i0-error{font-size:13px;color:var(--i0-bad)}
.i0-input,.i0-select{width:100%;min-height:40px;border:1px solid var(--i0-line);border-radius:8px;padding:8px 12px;font:inherit;font-size:15px;background:var(--i0-paper);color:var(--i0-ink)}
.i0-input:focus,.i0-select:focus{outline:none;border-color:var(--i0-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--i0-accent) 18%,transparent)}
.i0-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.i0-button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 18px;border:1px solid var(--i0-accent);border-radius:8px;background:var(--i0-accent);color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer}
.i0-button:disabled{opacity:.6;cursor:default}
.i0-button[data-variant=quiet]{background:transparent;color:var(--i0-accent)}
.i0-part{font-size:13px;color:var(--i0-muted)}
.i0-confirm{gap:10px;align-items:flex-start;font-size:14px;border:1px solid var(--i0-line);background:var(--i0-wash);border-radius:8px;padding:10px 12px}
.i0-check{gap:10px;align-items:center;font-size:14px}

/* Information pages */
.i0-section{display:grid;gap:10px}
.i0-cite{font-size:11px;vertical-align:super;line-height:0;margin-left:2px;color:var(--i0-accent);text-decoration:none;font-weight:600}
.i0-list{padding-left:20px;display:grid;gap:4px}
.i0-callout{border-left:3px solid var(--i0-accent);background:var(--i0-wash);padding:10px 14px;border-radius:0 8px 8px 0}
.i0-callout[data-tone=warning]{border-left-color:var(--i0-warn)}
.i0-code{border:1px solid var(--i0-line);border-radius:10px;overflow:hidden;background:var(--i0-wash)}
.i0-code-head{display:flex;justify-content:space-between;align-items:center;padding:6px 10px 6px 14px;font-size:12px;color:var(--i0-muted);border-bottom:1px solid var(--i0-line)}
.i0-code pre{padding:12px 14px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.55;color:var(--i0-ink);white-space:pre}
.i0-task{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 14px;border:1px solid var(--i0-line);border-radius:10px}
.i0-task strong{font-weight:600}

/* Done */
.i0-done{display:grid;gap:12px}
.i0-ok{color:var(--i0-ok);font-weight:650;font-size:17px}
.i0-ref{display:grid;gap:2px}
.i0-ref b{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:20px;letter-spacing:.02em}
.i0-also{border-left:3px solid var(--i0-warn);background:var(--i0-wash);padding:10px 14px;border-radius:0 8px 8px 0;display:grid;gap:4px}
`;
