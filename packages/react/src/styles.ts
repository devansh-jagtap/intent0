/**
 * The layer's own CSS, injected once. Prefixed with i0- so it can't clash with the site's styles,
 * and it doesn't depend on the site using Tailwind. Colours, fonts, headings, buttons, cards and
 * the content width come from the host site itself (site-look.ts sets the --i0-* variables), so a
 * generated page wears the site's look. The only fixed scene is the dark "generating" screen.
 */
export const INTENT0_CSS = `
.i0-layer{--i0-bg:#fff;--i0-ink:#1c2433;--i0-accent:var(--intent0-accent,#2f4fa8);--i0-on-accent:#fff;--i0-font:inherit;--i0-head-font:var(--i0-font);--i0-head-weight:700;--i0-head-spacing:-.02em;--i0-head-ink:var(--i0-ink);
  --i0-btn-radius:10px;--i0-btn-weight:600;--i0-btn-font:var(--i0-font);--i0-card-radius:14px;--i0-card:color-mix(in srgb,var(--i0-ink) 5%,var(--i0-bg));--i0-width:1080px;
  --i0-muted:color-mix(in srgb,var(--i0-ink) 64%,var(--i0-bg));--i0-line:color-mix(in srgb,var(--i0-ink) 14%,var(--i0-bg));--i0-wash:color-mix(in srgb,var(--i0-ink) 5%,var(--i0-bg));
  --i0-tint:color-mix(in srgb,var(--i0-accent) 12%,var(--i0-bg));--i0-ok:#1d7a4f;--i0-warn:#9a5b00;--i0-bad:#b42318;--i0-ease:cubic-bezier(.2,.8,.2,1);
  font-family:var(--i0-font);font-size:16px;line-height:1.55;color:var(--i0-ink);text-align:left}
.i0-layer[data-theme=dark]{--i0-ok:#5cc59a;--i0-warn:#e0a84f;--i0-bad:#f08a80}
.i0-layer *{box-sizing:border-box}
/* Shield against the site's global element styles (e.g. input{width:100%}, label{display:block}, h1{margin}). */
.i0-layer input[type=checkbox]{width:auto;min-height:0;padding:0;margin:0;flex:none;accent-color:var(--i0-accent)}
.i0-layer label.i0-confirm,.i0-layer label.i0-check{display:flex;margin:0}
.i0-layer label.i0-label{display:block;margin:0}
.i0-layer p,.i0-layer h1,.i0-layer h2,.i0-layer h3,.i0-layer ul,.i0-layer ol,.i0-layer pre,.i0-layer figure{margin:0}
.i0-layer h1,.i0-layer h2,.i0-layer h3{font-family:var(--i0-head-font);font-weight:var(--i0-head-weight);letter-spacing:var(--i0-head-spacing);color:var(--i0-head-ink);text-transform:none}
.i0-layer :focus-visible{outline:2px solid var(--i0-accent);outline-offset:2px}
.i0-layer q{quotes:"“" "”"}

/* The launcher: a button in the bottom-right corner */
.i0-launch{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;align-items:center;gap:8px;
  padding:12px 18px;border:0;border-radius:999px;background:var(--i0-accent);color:var(--i0-on-accent);font:inherit;font-family:var(--i0-btn-font);font-size:15px;font-weight:650;cursor:pointer;
  box-shadow:0 0 0 1px rgba(255,255,255,.55),0 10px 28px -8px rgba(16,24,40,.5);transition:transform .2s var(--i0-ease)}
.i0-launch:hover{transform:translateY(-2px)}
.i0-launch:focus-visible{outline:2px solid var(--i0-accent);outline-offset:3px}
.i0-launch-dot{position:absolute;top:4px;right:6px;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px var(--i0-accent)}
@media (max-width:640px){.i0-launch{right:16px;bottom:16px}}

/* One full-screen layer with three scenes: ask, generating, the page */
.i0-screen{position:fixed;inset:0;z-index:2147483002;display:flex;flex-direction:column;background:var(--i0-bg);color:var(--i0-ink);overflow:hidden}
.i0-screen[data-view=gen]{background:#000;color:#fff}
.i0-x{display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:999px;background:none;color:inherit;opacity:.7;cursor:pointer;flex:none}
.i0-x:hover{opacity:1;background:var(--i0-wash)}

/* 1. Ask */
.i0-ask{flex:1;display:flex;flex-direction:column;min-height:0;overflow-y:auto;background:radial-gradient(1200px 520px at 50% -10%,var(--i0-tint),transparent 70%)}
.i0-ask-top{display:flex;justify-content:space-between;align-items:center;padding:16px 20px 0 24px;font-weight:600;color:var(--i0-muted)}
.i0-ask-main{width:100%;max-width:820px;margin:auto;padding:24px 24px 12vh;display:grid;gap:22px}
.i0-ask-title{font-size:clamp(2.2rem,1.4rem + 3.4vw,4.2rem);line-height:1.02}
.i0-ask-row{display:flex;gap:10px;align-items:center;padding:8px;border:1.5px solid var(--i0-line);border-radius:calc(var(--i0-btn-radius) + 8px);background:var(--i0-bg);transition:border-color .2s,box-shadow .2s}
.i0-ask-row:focus-within{border-color:var(--i0-accent);box-shadow:0 0 0 5px color-mix(in srgb,var(--i0-accent) 16%,transparent)}
.i0-intent{flex:1;min-width:0;width:100%;height:52px;border:0;background:none;padding:0 12px;font:inherit;font-size:clamp(1.05rem,1rem + .4vw,1.3rem);color:var(--i0-ink);outline:none}
.i0-intent::placeholder{color:var(--i0-muted)}
.i0-mic{flex:none;display:grid;place-items:center;width:48px;height:48px;border:0;border-radius:var(--i0-btn-radius);background:var(--i0-wash);color:var(--i0-muted);cursor:pointer}
.i0-mic:hover{color:var(--i0-accent)}
.i0-mic[data-on]{color:#fff;background:var(--i0-bad)}
.i0-ask-row [data-i0-primary]{min-height:48px;padding:0 22px}
.i0-ask-more{display:grid;gap:10px}
.i0-ask-hint{font-size:15px}
.i0-suggest{display:flex;flex-wrap:wrap;gap:8px}
.i0-chip{border:1px solid var(--i0-line);background:var(--i0-bg);color:var(--i0-ink);border-radius:999px;padding:8px 14px;cursor:pointer;font:inherit;font-size:15px;text-align:left;transition:border-color .2s,color .2s,transform .2s var(--i0-ease)}
.i0-chip:hover{border-color:var(--i0-accent);color:var(--i0-accent);transform:translateY(-1px)}

/* 2. Generating your experience */
.i0-gen{flex:1;display:grid;place-content:center;justify-items:center;gap:18px;padding:24px;text-align:center}
.i0-gen-art{position:relative;width:132px;height:132px;margin-bottom:18px}
.i0-gen-art span{position:absolute;inset:0;border-radius:50%;border:2px solid transparent;border-top-color:var(--i0-accent);border-right-color:color-mix(in srgb,var(--i0-accent) 40%,transparent)}
.i0-gen-art span:nth-child(2){inset:18px;border-top-color:#fff;border-right-color:transparent;border-left-color:rgba(255,255,255,.35)}
.i0-gen-art span:nth-child(3){inset:46px;border:0;background:var(--i0-accent);box-shadow:0 0 60px 18px color-mix(in srgb,var(--i0-accent) 45%,transparent)}
.i0-gen-title{font-family:var(--i0-head-font);font-weight:var(--i0-head-weight);letter-spacing:var(--i0-head-spacing);font-size:clamp(1.9rem,1.2rem + 2.6vw,3.4rem);line-height:1.05;color:#fff}
.i0-gen-status{font-size:17px;color:rgba(255,255,255,.72);min-height:1.6em}
.i0-gen-asked{max-width:52ch;font-size:15px;color:rgba(255,255,255,.5)}

/* 3. The page */
.i0-pageview{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.i0-pagebar{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:10px max(20px,calc((100% - var(--i0-width)) / 2));
  background:color-mix(in srgb,var(--i0-bg) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--i0-line);font-size:14px}
.i0-pagebar-asked{color:var(--i0-muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.i0-pagebar-asked q{color:var(--i0-ink);font-weight:600}
.i0-pagebar-actions{display:flex;align-items:center;gap:6px;flex:none}
.i0-wrap{width:100%;max-width:var(--i0-width);margin:0 auto;padding:clamp(28px,5vw,64px) 20px 96px;display:grid;gap:32px}
.i0-page{display:grid;gap:28px}
.i0-hero{display:grid;gap:16px;padding-bottom:8px}
.i0-title{font-size:clamp(2rem,1.3rem + 2.8vw,3.6rem);line-height:1.04}
.i0-lead{font-size:clamp(1.1rem,1rem + .5vw,1.4rem);line-height:1.45;max-width:60ch;color:var(--i0-ink)}
.i0-facts{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.i0-facts li{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:var(--i0-tint);font-size:15px;font-weight:550}
.i0-facts li svg{color:var(--i0-accent)}
.i0-facts li.i0-facts-cite{background:none;padding:0}
.i0-h2{font-size:clamp(1.4rem,1.2rem + .8vw,1.9rem);line-height:1.15}
.i0-h3{font-size:clamp(1.2rem,1.1rem + .4vw,1.5rem);line-height:1.2}
.i0-text{font-size:16.5px;max-width:70ch}
.i0-muted{color:var(--i0-muted)}
.i0-section{display:grid;gap:14px}
.i0-card{background:var(--i0-card);border-radius:var(--i0-card-radius);padding:clamp(20px,2.4vw,32px)}
.i0-cite{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;margin-left:5px;border-radius:999px;background:var(--i0-tint);color:var(--i0-accent);font-size:11px;font-weight:700;line-height:1;text-decoration:none;vertical-align:2px}
.i0-cite:hover{background:var(--i0-accent);color:var(--i0-on-accent)}
.i0-list{padding-left:22px;display:grid;gap:6px}
.i0-callout{border-left:3px solid var(--i0-accent);background:var(--i0-wash);padding:12px 16px;border-radius:0 var(--i0-card-radius) var(--i0-card-radius) 0}
.i0-callout[data-tone=warning]{border-left-color:var(--i0-warn)}
.i0-code{border-radius:min(var(--i0-card-radius),16px);overflow:hidden;background:#0f1115;color:#e8eaee}
.i0-code-head{display:flex;justify-content:space-between;align-items:center;padding:8px 10px 8px 16px;font-size:12.5px;color:rgba(232,234,238,.6);border-bottom:1px solid rgba(255,255,255,.08)}
.i0-code pre{padding:14px 16px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13.5px;line-height:1.6;white-space:pre}
.i0-copy{border:0;border-radius:999px;padding:5px 12px;background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;transition:background .2s}
.i0-copy:hover{background:rgba(255,255,255,.2)}
.i0-copy[data-done]{background:var(--i0-accent);color:var(--i0-on-accent)}
.i0-task{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 20px;background:var(--i0-card);border-radius:var(--i0-card-radius)}
.i0-task strong{font-weight:650;font-size:17px}

/* Buttons: the site's own button, by its colour, roundness, weight and font */
.i0-button,.i0-layer [data-i0-primary]{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 20px;border:0;border-radius:var(--i0-btn-radius);background:var(--i0-accent);color:var(--i0-on-accent);
  font:inherit;font-family:var(--i0-btn-font);font-size:15.5px;font-weight:var(--i0-btn-weight);cursor:pointer;transition:filter .2s,transform .15s var(--i0-ease)}
.i0-button:hover,.i0-layer [data-i0-primary]:hover{filter:brightness(1.08)}
.i0-button:active,.i0-layer [data-i0-primary]:active{transform:scale(.97)}
.i0-button:disabled{opacity:.6;cursor:default}
.i0-quiet{background:none;border:0;padding:8px 12px;border-radius:999px;font:inherit;font-size:14.5px;font-weight:600;color:var(--i0-ink);cursor:pointer}
.i0-quiet:hover{background:var(--i0-wash)}

/* A guided walk-through */
.i0-guide{display:grid;gap:18px}
.i0-progress{height:6px;border-radius:999px;background:var(--i0-wash);overflow:hidden}
.i0-progress span{display:block;height:100%;border-radius:inherit;background:var(--i0-accent);transition:width .6s var(--i0-ease)}
.i0-guide-body{display:grid;grid-template-columns:minmax(200px,280px) minmax(0,1fr);gap:24px;align-items:start}
.i0-guide-nav{list-style:none;padding:0;display:grid;gap:4px;position:sticky;top:76px}
.i0-guide-nav button{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:0;border-radius:var(--i0-card-radius);background:none;color:var(--i0-muted);font:inherit;font-size:15px;text-align:left;cursor:pointer;transition:background .2s,color .2s}
.i0-guide-nav button:hover{background:var(--i0-wash);color:var(--i0-ink)}
.i0-guide-nav button[aria-current]{background:var(--i0-tint);color:var(--i0-ink);font-weight:650}
.i0-guide-n{flex:none;display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;border:1.5px solid var(--i0-line);font-size:13px;font-weight:700;transition:all .3s var(--i0-ease)}
.i0-guide-nav button[aria-current] .i0-guide-n{border-color:var(--i0-accent);color:var(--i0-accent)}
.i0-guide-nav button[data-done] .i0-guide-n{background:var(--i0-accent);border-color:var(--i0-accent);color:var(--i0-on-accent)}
.i0-guide-step{display:grid;gap:16px;background:var(--i0-card);border-radius:var(--i0-card-radius);padding:clamp(20px,2.6vw,36px);min-width:0}
.i0-guide-count{font-size:14px;font-weight:600;color:var(--i0-accent)}
.i0-guide-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:6px}
.i0-finished{display:inline-flex;align-items:center;gap:8px;font-weight:650;color:var(--i0-accent)}

/* A choice between alternatives */
.i0-choice{display:grid;gap:16px}
.i0-choice-label{font-weight:650;font-size:15px;color:var(--i0-muted)}
.i0-tabs{display:inline-flex;flex-wrap:wrap;gap:4px;padding:5px;border-radius:999px;background:var(--i0-wash);justify-self:start;max-width:100%}
.i0-tabs button{border:0;border-radius:999px;padding:10px 18px;background:none;color:var(--i0-muted);font:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:background .25s var(--i0-ease),color .25s}
.i0-tabs button:hover{color:var(--i0-ink)}
.i0-tabs button[aria-selected=true]{background:var(--i0-accent);color:var(--i0-on-accent)}
.i0-choice-panel{display:grid;gap:18px}

/* A checklist */
.i0-checklist{display:grid;gap:10px}
.i0-checklist ul{list-style:none;padding:0;display:grid;gap:8px}
.i0-checklist label{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:var(--i0-card-radius);background:var(--i0-bg);border:1px solid var(--i0-line);cursor:pointer;transition:border-color .2s,background .2s}
.i0-checklist label:hover{border-color:var(--i0-accent)}
.i0-checklist input{position:absolute;opacity:0;pointer-events:none}
.i0-box{flex:none;display:grid;place-items:center;width:22px;height:22px;margin-top:1px;border-radius:7px;border:1.5px solid var(--i0-line);color:transparent;transition:all .25s var(--i0-ease)}
.i0-checklist label[data-on]{background:var(--i0-tint);border-color:transparent}
.i0-checklist label[data-on] .i0-box{background:var(--i0-accent);border-color:var(--i0-accent);color:var(--i0-on-accent);transform:scale(1.08)}
.i0-checklist input:focus-visible+.i0-box{outline:2px solid var(--i0-accent);outline-offset:2px}
.i0-checklist-foot{font-size:14px;color:var(--i0-muted)}

/* A task's own steps, at the top of its page */
.i0-flow-steps{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px 18px;font-size:15px;color:var(--i0-muted)}
.i0-flow-steps li{display:flex;align-items:center;gap:8px}
.i0-flow-steps li[data-state=current]{color:var(--i0-ink);font-weight:650}
.i0-flow-steps li[data-state=current] .i0-guide-n{border-color:var(--i0-accent);color:var(--i0-accent)}
.i0-flow-steps li[data-state=done] .i0-guide-n{background:var(--i0-accent);border-color:var(--i0-accent);color:var(--i0-on-accent)}

/* Sources and footer */
.i0-sources{display:grid;gap:12px;padding-top:24px;border-top:1px solid var(--i0-line)}
.i0-sources-title{font-size:14px;font-weight:650;color:var(--i0-muted)}
.i0-sources ol{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px}
.i0-sources a{display:flex;gap:10px;padding:12px 14px;border-radius:var(--i0-card-radius);background:var(--i0-wash);color:var(--i0-ink);text-decoration:none;font-size:15px;font-weight:600;transition:background .2s}
.i0-sources a:hover{background:var(--i0-tint)}
.i0-sources small{display:block;font-weight:400;color:var(--i0-muted);font-size:13.5px}
.i0-src-n{color:var(--i0-accent);font-weight:700}
.i0-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--i0-muted)}
.i0-alert{font-size:15px;border:1px solid color-mix(in srgb,var(--i0-bad) 40%,transparent);background:color-mix(in srgb,var(--i0-bad) 8%,var(--i0-bg));color:var(--i0-bad);border-radius:var(--i0-card-radius);padding:12px 14px}
.i0-thinking{display:flex;gap:10px;align-items:center;font-size:15px;color:var(--i0-muted)}
.i0-dot{width:8px;height:8px;border-radius:50%;background:var(--i0-accent)}

/* Forms */
.i0-form,.i0-group{display:grid;gap:18px}
.i0-group{border:0;padding:0;margin:0;min-width:0}
.i0-legend{font-size:15px;font-weight:650;margin-bottom:4px;padding:0}
.i0-field{display:grid;gap:6px}
.i0-label{font-size:15px;font-weight:600}
.i0-req{color:var(--i0-bad)}
.i0-help{font-size:14px;color:var(--i0-muted)}
.i0-error{font-size:14px;color:var(--i0-bad)}
.i0-input,.i0-select{width:100%;min-height:46px;border:1.5px solid var(--i0-line);border-radius:min(var(--i0-btn-radius),14px);padding:10px 14px;font:inherit;font-size:16px;background:var(--i0-bg);color:var(--i0-ink)}
.i0-input:focus,.i0-select:focus{outline:none;border-color:var(--i0-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--i0-accent) 16%,transparent)}
.i0-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.i0-part{font-size:14px;color:var(--i0-muted)}
.i0-confirm{gap:10px;align-items:flex-start;font-size:15px;border:1px solid var(--i0-line);background:var(--i0-bg);border-radius:var(--i0-card-radius);padding:12px 14px}
.i0-check{gap:10px;align-items:center;font-size:15px}

/* Done */
.i0-done{display:grid;gap:14px}
.i0-done-badge{display:inline-flex;align-items:center;gap:8px;justify-self:start;padding:6px 14px;border-radius:999px;background:var(--i0-accent);color:var(--i0-on-accent);font-weight:700;font-size:14px}
.i0-ref{display:grid;gap:2px}
.i0-ref b{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:clamp(1.4rem,1.2rem + 1vw,2rem);letter-spacing:.02em}
.i0-also{border-left:3px solid var(--i0-warn);background:var(--i0-wash);padding:12px 16px;border-radius:0 var(--i0-card-radius) var(--i0-card-radius) 0;display:grid;gap:4px}

@media (max-width:760px){
  .i0-guide-body{grid-template-columns:1fr}
  .i0-guide-nav{position:static;display:flex;overflow-x:auto;gap:6px;padding-bottom:4px}
  .i0-guide-nav button{white-space:nowrap}
  .i0-ask-row{flex-wrap:wrap}
  .i0-ask-row [data-i0-primary]{width:100%}
  .i0-task{flex-direction:column;align-items:flex-start}
}

/* Motion: the screen arrives, the dark scene breathes, the page builds itself part by part. */
@media (prefers-reduced-motion:no-preference){
  .i0-screen[data-view=ask]{animation:i0-fade .3s ease}
  .i0-ask-main>*{animation:i0-rise .7s var(--i0-ease) both}
  .i0-ask-main>*:nth-child(2){animation-delay:.08s}
  .i0-ask-main>*:nth-child(3){animation-delay:.16s}
  .i0-ask-main>*:nth-child(4){animation-delay:.24s}
  .i0-gen{animation:i0-fade .5s ease}
  .i0-gen-art span:nth-child(1){animation:i0-spin 1.6s linear infinite}
  .i0-gen-art span:nth-child(2){animation:i0-spin 2.4s linear infinite reverse}
  .i0-gen-art span:nth-child(3){animation:i0-breathe 1.8s ease-in-out infinite}
  .i0-gen-title{animation:i0-rise .8s var(--i0-ease) both .1s}
  .i0-gen-status{animation:i0-swap 1.3s ease both}
  .i0-pageview{animation:i0-reveal .7s var(--i0-ease)}
  .i0-in{animation:i0-rise .7s var(--i0-ease) both;animation-delay:calc(var(--i0-i,0) * 90ms + 120ms)}
  .i0-guide-step,.i0-choice-panel{animation:i0-slide .45s var(--i0-ease)}
  .i0-dot,.i0-mic[data-on]{animation:i0-pulse 1s ease-in-out infinite}
}
@keyframes i0-fade{from{opacity:0}}
@keyframes i0-rise{from{opacity:0;transform:translateY(18px)}}
@keyframes i0-reveal{from{opacity:0;transform:scale(.985)}}
@keyframes i0-slide{from{opacity:0;transform:translateX(14px)}}
@keyframes i0-spin{to{transform:rotate(360deg)}}
@keyframes i0-breathe{50%{transform:scale(.72);opacity:.75}}
@keyframes i0-swap{0%{opacity:0;transform:translateY(8px)}15%,85%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-6px)}}
@keyframes i0-pulse{50%{opacity:.3}}
`;
