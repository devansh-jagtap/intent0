/*
 * The dashboard's single page: plain HTML, CSS and JavaScript (no build step, no outside
 * requests). Everything shown is built with DOM calls, never by pasting text into HTML,
 * so task names or page titles from the site can't inject markup.
 */
export function dashboardPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>intent0 dashboard</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%236d4aff'/%3E%3Ccircle cx='16' cy='16' r='6' fill='none' stroke='white' stroke-width='3'/%3E%3C/svg%3E">
<style>${CSS}</style>
</head>
<body>
<div class="app">
  <aside class="side">
    <div class="brand"><svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9"/><circle cx="16.5" cy="15" r="7"/><path d="M10.6 18.6 L8.4 24.6 L14.4 21.6 Z"/></svg>intent0<small>dashboard</small></div>
    <nav id="nav"></nav>
    <div class="side-foot" id="sideFoot"></div>
  </aside>
  <main>
    <header class="top">
      <div><h1 id="siteName">Loading…</h1><p class="muted" id="siteMeta"></p></div>
      <span class="pill" id="status"></span>
    </header>
    <div class="savebar" id="savebar" hidden>
      <span>You have unsaved changes to your tasks.</span>
      <div class="row"><button class="ghost" id="discard">Discard</button><button id="save">Save &amp; approve</button></div>
    </div>
    <div id="notice" class="notice" hidden></div>
    <section id="view"></section>
  </main>
</div>
<script>${SCRIPT}</script>
</body>
</html>`;
}

const CSS = String.raw`
:root{--bg:#f6f6f3;--card:#fff;--ink:#14171a;--muted:#5d6461;--line:#e4e4df;--accent:#173f35;--accent-soft:#e4efe9;--on-accent:#fff;--lamp:#f7941d;--ok:#0f8a5f;--ok-soft:#e3f6ee;--warn:#a15c00;--warn-soft:#fff2dc;--bad:#c0262d;--bad-soft:#fde8e8;--radius:12px;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0d0f0e;--card:#161a18;--ink:#eceeed;--muted:#9aa29e;--line:#272c2a;--accent:#f7941d;--accent-soft:#2e2414;--on-accent:#14171a;--lamp:#f7941d;--ok:#3ccf91;--ok-soft:#0f2b20;--warn:#f0b35a;--warn-soft:#2e2312;--bad:#ff7b7f;--bad-soft:#341719;color-scheme:dark}}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.app{display:grid;grid-template-columns:232px 1fr;min-height:100vh}
.side{border-right:1px solid var(--line);padding:20px 14px;display:flex;flex-direction:column;gap:18px;position:sticky;top:0;height:100vh;background:var(--card)}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px;padding:0 8px}.brand small{font-weight:500;color:var(--muted);font-size:12px;margin-left:auto}
.logo{width:22px;height:22px;flex:none}.logo rect{fill:var(--accent)}.logo rect{fill:#173f35}.logo circle{fill:none;stroke:var(--lamp);stroke-width:3.2}.logo path{fill:var(--lamp)}
nav{display:flex;flex-direction:column;gap:2px}nav button{all:unset;cursor:pointer;padding:8px 10px;border-radius:8px;color:var(--muted);display:flex;justify-content:space-between}
nav button:hover{background:var(--bg);color:var(--ink)}nav button[aria-current=page]{background:var(--accent-soft);color:var(--accent);font-weight:600}
nav button:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.side-foot{margin-top:auto;color:var(--muted);font-size:12px;padding:0 8px}
main{padding:28px clamp(16px,4vw,48px) 80px;max-width:1080px;width:100%}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}h1{margin:0;font-size:24px;letter-spacing:-.02em}h2{font-size:17px;margin:0 0 4px}h3{font-size:14px;margin:0}
.muted{color:var(--muted);margin:2px 0 0}.pill{border-radius:99px;padding:4px 10px;font-weight:600;font-size:12px;white-space:nowrap}
.pill.ok{background:var(--ok-soft);color:var(--ok)}.pill.warn{background:var(--warn-soft);color:var(--warn)}.pill.bad{background:var(--bad-soft);color:var(--bad)}.pill.off{background:var(--bg);color:var(--muted);border:1px solid var(--line)}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px;margin-bottom:14px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.stat b{display:block;font-size:28px;letter-spacing:-.02em;overflow-wrap:anywhere}.stat b.text{font-size:17px;line-height:1.3;padding:6px 0 4px}.stat span{color:var(--muted)}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.between{justify-content:space-between}
button{font:inherit;border:0;border-radius:9px;padding:8px 14px;background:var(--accent);color:var(--on-accent);font-weight:600;cursor:pointer}button:disabled{opacity:.5;cursor:default}
button.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}button.small{padding:5px 10px;font-size:13px}
label{display:flex;flex-direction:column;gap:4px;font-weight:600;font-size:12px;color:var(--muted)}
input,select,textarea{font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px 10px;width:100%}
textarea{min-height:64px;resize:vertical}textarea.code{font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;min-height:420px}
.check{flex-direction:row;align-items:center;gap:8px;color:var(--ink);font-weight:500;font-size:14px}.check input{width:auto}
.fields{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:12px}
details{border-top:1px solid var(--line);margin-top:14px;padding-top:12px}summary{cursor:pointer;font-weight:600}
.step{border:1px solid var(--line);border-radius:10px;padding:12px;margin-top:10px}.step .meta{font:12px ui-monospace,Menlo,monospace;color:var(--muted)}
.fieldrow{display:grid;grid-template-columns:1.4fr .6fr 1.4fr auto;gap:8px;align-items:end;margin-top:8px}
.switch{position:relative;width:40px;height:22px;flex:none}.switch input{opacity:0;width:0;height:0;position:absolute}
.switch span{position:absolute;inset:0;background:var(--line);border-radius:99px;transition:.2s;cursor:pointer}.switch span:after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.2s}
.switch input:checked+span{background:var(--accent)}.switch input:checked+span:after{transform:translateX(18px);background:var(--on-accent)}.switch input:focus-visible+span{outline:2px solid var(--accent);outline-offset:2px}
.savebar{position:sticky;top:12px;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--ink);color:var(--bg);border-radius:var(--radius);padding:10px 12px 10px 16px;margin-bottom:14px;box-shadow:0 8px 24px rgba(0,0,0,.18)}
.savebar button.ghost{color:var(--bg);border-color:rgba(255,255,255,.3)}
.notice{border-radius:var(--radius);padding:12px 16px;margin-bottom:14px;background:var(--ok-soft);color:var(--ok)}.notice.bad{background:var(--bad-soft);color:var(--bad)}.notice ul{margin:6px 0 0;padding-left:18px}
pre{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;overflow:auto;font:12px/1.5 ui-monospace,Menlo,monospace;margin:8px 0 0}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:600;font-size:12px}
.tags{display:flex;gap:6px;flex-wrap:wrap}.tag{background:var(--bg);border:1px solid var(--line);border-radius:99px;padding:2px 9px;font-size:12px}
.result{margin-top:14px}.empty{color:var(--muted);text-align:center;padding:30px}
@media (max-width:760px){.app{grid-template-columns:1fr}.side{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center}nav{flex-direction:row;flex-wrap:wrap}.side-foot{display:none}.fieldrow{grid-template-columns:1fr 1fr}}
`;

const SCRIPT = String.raw`
"use strict";
const params = new URLSearchParams(location.search);
let token = params.get("token") || "";
try { if (token) sessionStorage.setItem("intent0-token", token); else token = sessionStorage.getItem("intent0-token") || ""; } catch {}
if (params.has("token")) history.replaceState(null, "", location.pathname);

let state = null;      // what the server last sent
let draft = null;      // the manifest being edited
let dirty = false;
let view = "overview";
const VIEWS = [["overview","Overview"],["tasks","Tasks"],["content","Site Memory"],["agents","AI agents"],["model","Model"],["try","Try a request"],["json","Advanced (JSON)"]];

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (k === "checked") el.checked = Boolean(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

async function api(path, body) {
  const res = await fetch(path, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", "x-intent0-token": token }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed (" + res.status + ")"), { data });
  return data;
}

function notify(message, bad, list) {
  const n = document.getElementById("notice");
  n.replaceChildren(...[h("strong", {}, message), list && list.length ? h("ul", {}, list.slice(0, 12).map((x) => h("li", {}, x))) : null].filter(Boolean));
  n.className = "notice" + (bad ? " bad" : "");
  n.hidden = false;
  if (!bad) setTimeout(() => { n.hidden = true; }, 4000);
}

function setDirty(v) { dirty = v; document.getElementById("savebar").hidden = !v; }

async function load() {
  try {
    state = await api("/api/state");
  } catch (err) {
    document.getElementById("siteName").textContent = "Can't open the dashboard";
    document.getElementById("view").replaceChildren(h("div", { class: "card" }, err.message));
    return;
  }
  draft = state.manifest ? structuredClone(state.manifest) : null;
  setDirty(false);
  render();
}

function render() {
  const m = draft;
  document.getElementById("siteName").textContent = m ? m.site.name : state.project.name;
  document.getElementById("siteMeta").textContent = m ? m.site.baseUrl + " · " + (state.project.mode === "next" ? "Next.js route" : "script tag + intent0 serve") : state.project.root;
  const st = document.getElementById("status");
  if (!state.manifest) { st.className = "pill off"; st.textContent = "Not set up"; }
  else if (state.issues.length) { st.className = "pill bad"; st.textContent = "Manifest has problems"; }
  else if (state.manifest.status === "approved") { st.className = "pill ok"; st.textContent = "Approved · revision " + state.manifest.revision; }
  else { st.className = "pill warn"; st.textContent = "Draft · not shown to visitors"; }
  document.getElementById("sideFoot").textContent = "intent0 " + state.version + " · " + state.project.root;
  document.getElementById("nav").replaceChildren(...VIEWS.map(([id, label]) =>
    h("button", { "aria-current": view === id ? "page" : null, onclick: () => { view = id; render(); } }, label,
      id === "tasks" && m ? h("span", {}, String(m.flows.filter((f) => f.enabled).length) + "/" + m.flows.length) : null)));
  const v = document.getElementById("view");
  v.replaceChildren(...({ overview, tasks, content, agents, model, try: tryView, json: jsonView }[view])().filter(Boolean));
}

function overview() {
  const m = draft;
  const out = [];
  if (state.issues.length) out.push(h("div", { class: "notice bad" }, h("strong", {}, "intent0.manifest.json has problems"), h("ul", {}, state.issues.map((x) => h("li", {}, x)))));
  const on = m ? m.flows.filter((f) => f.enabled).length : 0;
  out.push(h("div", { class: "grid" },
    stat(on, "tasks on for visitors", m ? (m.flows.length - on) + " off" : "run intent0 init"),
    stat(state.memory ? state.memory.pages.length : 0, "pages in Site Memory", state.memory ? state.memory.sections + " sections · " + state.memory.codeBlocks + " code blocks" : "not built yet"),
    stat(state.agents.tools.length, "tools for AI agents", "public approved tasks + search"),
    stat(state.model.model || "none", "model", state.model.keySet ? "key saved in .env.local" : "no key: simple keyword mode"),
  ));
  out.push(h("div", { class: "card" }, h("h2", {}, "How visitors use this site"),
    h("p", { class: "muted" }, "Visitors click \"Ask this site\" (bottom right) or press Ctrl/⌘ K and say what they want. intent0 picks one of the tasks below, builds its step pages and submits to your own APIs, or answers from Site Memory with cited sources. Anything not approved here is never offered."),
    h("div", { class: "row", style: "margin-top:12px" }, h("button", { onclick: () => { view = "tasks"; render(); } }, "Review tasks"), h("button", { class: "ghost", onclick: () => { view = "try"; render(); } }, "Try a request"))));
  return out;
}

function stat(value, label, sub) {
  return h("div", { class: "card stat" }, h("b", { class: typeof value === "number" ? null : "text" }, String(value)), h("span", {}, label), h("p", { class: "muted", style: "font-size:12px" }, sub));
}

function edit(fn) { fn(); setDirty(true); }

function tasks() {
  if (!draft) return [h("div", { class: "card empty" }, "No manifest yet. Run npx intent0 init in your project first.")];
  if (!draft.flows.length) return [h("div", { class: "card empty" }, "No tasks: this site works as an information assistant (Site Memory only).")];
  return [h("p", { class: "muted", style: "margin:0 0 12px" }, "Turn tasks on or off, fix wording and endpoints, then Save & approve. Saving checks every rule first; nothing changes if a check fails.")]
    .concat(draft.flows.map(taskCard));
}

function taskCard(f) {
  const tags = [f.auth === "public" ? "public" : "needs sign-in", f.irreversible ? "irreversible: asks to confirm" : null, f.steps.length + " step" + (f.steps.length > 1 ? "s" : "")].filter(Boolean);
  return h("div", { class: "card" },
    h("div", { class: "row between" },
      h("div", {}, h("h2", {}, f.title), h("div", { class: "tags" }, h("span", { class: "tag" }, f.id), tags.map((t) => h("span", { class: "tag" }, t)))),
      h("label", { class: "check" }, f.enabled ? "On" : "Off", h("span", { class: "switch" }, h("input", { type: "checkbox", checked: f.enabled, "aria-label": "Offer " + f.title + " to visitors", onchange: (e) => edit(() => { f.enabled = e.target.checked; render(); }) }), h("span", {})))),
    h("div", { class: "fields" },
      input("Title", f.title, (v) => (f.title = v)),
      input("Original page (fallback)", f.fallbackPath, (v) => (f.fallbackPath = v)),
      select("Who can use it", f.auth, [["public", "Anyone"], ["signed_in", "Signed-in people"]], (v) => (f.auth = v)),
      h("label", { class: "check", style: "align-self:end" }, h("input", { type: "checkbox", checked: f.irreversible, onchange: (e) => edit(() => (f.irreversible = e.target.checked)) }), "Irreversible (ask to confirm before the final submit)")),
    h("div", { class: "fields" },
      textarea("What it does", f.description, (v) => (f.description = v)),
      textarea("Things people say (one per line)", (f.examples || []).join("\n"), (v) => (f.examples = v.split("\n").map((s) => s.trim()).filter(Boolean)))),
    h("details", {}, h("summary", {}, "Steps, fields and endpoints"), f.steps.map((s, i) => stepBox(s, i)),
      h("div", { class: "fields" },
        textarea("You may also need (shown after finishing, no links)", f.alsoNeed ? f.alsoNeed.text : "", (v) => (f.alsoNeed = v.trim() ? { text: v.trim(), approved: true } : undefined)))));
}

function stepBox(s, i) {
  return h("div", { class: "step" },
    h("div", { class: "row between" }, h("h3", {}, (i + 1) + ". " + s.title), h("span", { class: "meta" }, s.kind)),
    h("div", { class: "fields" },
      input("Step title", s.title, (v) => (s.title = v)),
      s.action ? select("Method", s.action.method, ["GET", "POST", "PUT", "PATCH", "DELETE"].map((x) => [x, x]), (v) => (s.action.method = v)) : null,
      s.action ? input("Endpoint on your site", s.action.path, (v) => (s.action.path = v)) : null),
    s.action ? h("p", { class: "meta" }, "sends " + (s.action.sends.join(", ") || "nothing") + " · returns " + (s.action.returns.join(", ") || "nothing")) : null,
    s.fields.map((fl) => h("div", { class: "fieldrow" },
      input("Field label (" + fl.name + ")", fl.label, (v) => (fl.label = v)),
      h("label", {}, "Type", h("input", { value: fl.type, disabled: true })),
      input("Help text", fl.help || "", (v) => (fl.help = v || undefined)),
      h("label", { class: "check" }, h("input", { type: "checkbox", checked: fl.required !== false, onchange: (e) => edit(() => (fl.required = e.target.checked)) }), "Required"))));
}

function input(label, value, set) { return h("label", {}, label, h("input", { value, oninput: (e) => edit(() => set(e.target.value)) })); }
function textarea(label, value, set) { return h("label", {}, label, h("textarea", { oninput: (e) => edit(() => set(e.target.value)) }, value)); }
function select(label, value, options, set) {
  return h("label", {}, label, h("select", { onchange: (e) => edit(() => set(e.target.value)) }, options.map(([v, t]) => { const o = h("option", { value: v }, t); o.selected = v === value; return o; })));
}

function content() {
  const mem = state.memory;
  const rebuild = h("button", { onclick: async (e) => {
    e.target.disabled = true; e.target.textContent = "Reading your content…";
    try { const r = await api("/api/index", {}); notify("Site Memory rebuilt: " + r.pages + " pages, " + r.sections + " sections" + (r.crawled ? " (read " + r.crawled + ")" : " (site not running, files only)")); await load(); }
    catch (err) { notify(err.message, true); e.target.disabled = false; e.target.textContent = "Rebuild Site Memory"; }
  } }, "Rebuild Site Memory");
  const head = h("div", { class: "card" }, h("div", { class: "row between" }, h("div", {}, h("h2", {}, "Site Memory"),
    h("p", { class: "muted" }, "Your docs and pages split into sections with their links and exact code. Answers may only use these, with citations. Built without a model.")), rebuild));
  if (!mem) return [head, h("div", { class: "card empty" }, "Not built yet. Start your site and rebuild.")];
  return [head,
    h("div", { class: "card" }, h("h3", {}, "Main topics"), h("div", { class: "tags", style: "margin-top:8px" }, mem.topics.map((t) => h("span", { class: "tag" }, t))),
      h("p", { class: "muted", style: "font-size:12px" }, "Built " + new Date(mem.builtAt).toLocaleString())),
    h("div", { class: "card" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Page"), h("th", {}, "Address"), h("th", {}, "Sections"))),
      h("tbody", {}, mem.pages.map((p) => h("tr", {}, h("td", {}, p.title), h("td", {}, p.url), h("td", {}, String(p.sections)))))))];
}

function agents() {
  const site = state.agents.siteUrl ? new URL(state.agents.siteUrl).origin : "https://your-site";
  const stdio = JSON.stringify({ mcpServers: { [draft ? draft.site.id : "my-site"]: { command: "npx", args: ["intent0", "mcp", "--dir", state.project.root] } } }, null, 2);
  return [
    h("div", { class: "card" }, h("h2", {}, "What agents get"), h("p", { class: "muted" }, "Only public, approved tasks plus search_site. Sign-in tasks stay in the browser. Irreversible tasks need the person's confirmation; missing details are asked for, never guessed."),
      state.agents.tools.length ? h("table", { style: "margin-top:10px" }, h("tbody", {}, state.agents.tools.map((t) => h("tr", {}, h("td", {}, h("strong", {}, t.name), t.destructive ? h("div", { class: "tags" }, h("span", { class: "tag" }, "asks to confirm")) : null), h("td", { class: "muted" }, t.description)))))
        : h("p", { class: "empty" }, "No tools yet: approve a public task or build Site Memory.")),
    h("div", { class: "card" }, h("h2", {}, "Connect over HTTP"), h("p", { class: "muted" }, "Your running site answers MCP at this address. When deployed, set INTENT0_SITE_URL to its live address."), h("pre", {}, site + state.agents.httpPath)),
    h("div", { class: "card" }, h("h2", {}, "Connect a desktop agent"), h("p", { class: "muted" }, "Claude Desktop, Cursor and similar apps: add this to their MCP settings."), h("pre", {}, stdio)),
  ];
}

function model() {
  const base = h("input", { value: state.model.baseUrl, placeholder: "https://api.groq.com/openai/v1" });
  const name = h("input", { value: state.model.model, placeholder: "openai/gpt-oss-120b" });
  const key = h("input", { type: "password", autocomplete: "off", placeholder: state.model.keySet ? "Saved. Type a new key to replace it" : "Paste your API key" });
  const presets = [["Groq", "https://api.groq.com/openai/v1", "openai/gpt-oss-120b"], ["NVIDIA", "https://integrate.api.nvidia.com/v1", "openai/gpt-oss-120b"], ["OpenAI", "https://api.openai.com/v1", "gpt-4.1-mini"], ["Ollama (local)", "http://localhost:11434/v1", "llama3.2"]];
  return [h("div", { class: "card" }, h("h2", {}, "Model"),
    h("p", { class: "muted" }, "Any OpenAI-compatible API. The key is written only to .env.local on this computer (git-ignored) and is never shown here. Restart your site or intent0 serve to use a new model."),
    h("div", { class: "row", style: "margin-top:10px" }, presets.map(([t, u, md]) => h("button", { class: "ghost small", onclick: () => { base.value = u; name.value = md; } }, t))),
    h("div", { class: "fields" }, h("label", {}, "Base URL", base), h("label", {}, "Model", name), h("label", {}, "API key", key)),
    h("div", { class: "row", style: "margin-top:14px" }, h("button", { onclick: async () => {
      try { await api("/api/model", { baseUrl: base.value.trim(), model: name.value.trim(), apiKey: key.value.trim() || undefined }); key.value = ""; notify("Model saved to .env.local"); await load(); }
      catch (err) { notify(err.message, true); }
    } }, "Save model")))];
}

function tryView() {
  const text = h("input", { placeholder: "e.g. I want to report a broken streetlight", onkeydown: (e) => { if (e.key === "Enter") go(); } });
  const out = h("div", { class: "result" });
  async function go() {
    if (!text.value.trim()) return;
    out.replaceChildren(h("p", { class: "muted" }, "Thinking…"));
    try {
      const r = await api("/api/try", { text: text.value });
      const what = r.kind === "task" ? "Starts the task: " + r.flowTitle : r.kind === "content" ? "Answers from Site Memory" : "Nothing matches; the visitor is told so (no invented answers)";
      const pre = Object.entries(r.prefill || {});
      out.replaceChildren(h("div", { class: "card" }, h("h3", {}, what), h("p", { class: "muted" }, "via " + (r.via === "mock" ? "keyword matching (no model)" : r.via) + (r.confidence != null ? " · confidence " + Math.round(r.confidence * 100) + "%" : "")),
        pre.length ? h("div", {}, h("p", { class: "muted" }, "Filled in from the request:"), h("div", { class: "tags" }, pre.map(([k, v]) => h("span", { class: "tag" }, k + " = " + v)))) : null,
        !r.approved ? h("p", { class: "muted" }, "Note: the manifest isn't approved, so visitors see nothing yet.") : null));
    } catch (err) { out.replaceChildren(h("div", { class: "notice bad" }, err.message)); }
  }
  return [h("div", { class: "card" }, h("h2", {}, "Try a request"), h("p", { class: "muted" }, "See which task a visitor's sentence would start, using your saved tasks and model."),
    h("div", { class: "row", style: "margin-top:10px;flex-wrap:nowrap" }, text, h("button", { onclick: go }, "Try")), out)];
}

function jsonView() {
  if (!draft) return [h("div", { class: "card empty" }, "No manifest yet.")];
  const area = h("textarea", { class: "code", spellcheck: "false" }, JSON.stringify(draft, null, 2));
  return [h("div", { class: "card" }, h("h2", {}, "intent0.manifest.json"), h("p", { class: "muted" }, "Everything, including fields, options and what each endpoint sends and returns. Apply, then Save & approve."), area,
    h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "ghost", onclick: () => {
      try { draft = JSON.parse(area.value); setDirty(true); notify("Applied. Review, then Save & approve."); render(); } catch (err) { notify("Not valid JSON: " + err.message, true); }
    } }, "Apply changes")))];
}

document.getElementById("discard").addEventListener("click", () => { draft = structuredClone(state.manifest); setDirty(false); render(); });
document.getElementById("save").addEventListener("click", async (e) => {
  e.target.disabled = true;
  try {
    const r = await api("/api/manifest", { manifest: draft, baseRevision: state.manifest.revision });
    await load();
    notify("Saved and approved: revision " + r.revision + ". Your site picks it up on the next reload.");
  } catch (err) { notify(err.message, true, err.data && err.data.issues); }
  e.target.disabled = false;
});
window.addEventListener("beforeunload", (e) => { if (dirty) e.preventDefault(); });
load();
`;
