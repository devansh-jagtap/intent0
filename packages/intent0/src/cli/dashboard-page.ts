/** The dashboard page: plain HTML + script, served by `intent0 dashboard`. All text is inserted with textContent. */
export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>intent0 dashboard</title>
<style>
:root{--accent:#2f4fa8;--ink:#1c2433;--muted:#5b6475;--line:#d9dee8;--paper:#fff;--wash:#f5f7fb;--ok:#1d7a4f;--warn:#9a5b00;--bad:#b42318}
@media (prefers-color-scheme:dark){:root{--accent:#8fa8f0;--ink:#e6e9f0;--muted:#9aa3b5;--line:#2e3647;--paper:#151a24;--wash:#1c2230;--ok:#5cc59a;--warn:#e0a84f;--bad:#f08a80}}
*{box-sizing:border-box}
body{margin:0;background:var(--wash);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:var(--paper);border-bottom:1px solid var(--line)}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 20px;flex-wrap:wrap}
h1{font-size:20px;margin:0;font-weight:700;letter-spacing:-.01em}
h1 small{display:block;font-size:13px;font-weight:400;color:var(--muted)}
h2{font-size:16px;margin:0 0 12px}
.status{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.pill{border-radius:999px;padding:3px 10px;font-size:13px;font-weight:600;border:1px solid currentColor}
.pill.ok{color:var(--ok)}.pill.draft{color:var(--warn)}
main{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;padding:24px 20px 48px}
@media (max-width:860px){main{grid-template-columns:1fr}}
.card{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:18px}
aside{display:grid;gap:24px;align-content:start}
.task{border-top:1px solid var(--line);padding:14px 0;display:grid;gap:6px}
.task:first-of-type{border-top:0;padding-top:0}
.task-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.task-title{font-weight:650}
.task[data-off] .task-title,.task[data-off] .desc{color:var(--muted)}
.desc{color:var(--ink);font-size:14px;margin:0}
.tags{display:flex;gap:6px;flex-wrap:wrap}
.tag{font-size:12px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:0 6px}
.tag.warn{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 45%,transparent)}
details{font-size:13px;color:var(--muted)}
summary{cursor:pointer;width:max-content}
ol{margin:6px 0 0;padding-left:20px}
code{font-family:ui-monospace,Consolas,monospace;font-size:12px}
.also{font-size:13px;border-left:3px solid var(--warn);padding:4px 10px;background:var(--wash);display:flex;gap:10px;align-items:flex-start}
.switch{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);cursor:pointer;flex:none}
.switch input{appearance:none;width:38px;height:22px;border-radius:999px;background:var(--line);position:relative;cursor:pointer;margin:0;transition:background .15s}
.switch input::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s}
.switch input:checked{background:var(--ok)}
.switch input:checked::after{transform:translateX(16px)}
label.f{display:grid;gap:4px;font-size:13px;font-weight:600;margin-bottom:10px}
input.t,select{font:inherit;font-size:14px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);width:100%}
button{font:inherit;font-size:14px;font-weight:600;border-radius:8px;padding:7px 14px;cursor:pointer;border:1px solid var(--accent);background:var(--accent);color:#fff}
button.q{background:transparent;color:var(--accent)}
button:disabled{opacity:.55;cursor:default}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.muted{color:var(--muted);font-size:13px;margin:0}
.note{font-size:13px;margin:10px 0 0;min-height:1em}
.note.bad{color:var(--bad)}.note.ok{color:var(--ok)}
.issues{color:var(--bad);font-size:14px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
ul.pages{margin:8px 0 0;padding-left:18px;font-size:13px;max-height:180px;overflow:auto}
</style>
</head>
<body>
<header><div class="wrap top"><h1 id="site">intent0 dashboard<small>Loading…</small></h1><div class="status" id="status"></div></div></header>
<main class="wrap">
  <section class="card"><h2>Tasks people can do through intent0</h2><p class="muted" style="margin:-6px 0 14px">Only tasks switched on are offered, to visitors and to AI agents. Changes apply straight away.</p><div id="tasks"></div></section>
  <aside>
    <section class="card">
      <h2>Model</h2>
      <p class="muted" id="model-now"></p>
      <form id="model-form" style="margin-top:12px">
        <label class="f">Provider<select name="provider" id="provider"></select></label>
        <label class="f">Model<input class="t" name="model" id="model" autocomplete="off"></label>
        <label class="f">Base URL<input class="t" name="baseUrl" id="baseUrl" autocomplete="off"></label>
        <label class="f">New API key <span class="muted" style="font-weight:400">(leave empty to keep the current one)</span><input class="t" name="apiKey" type="password" autocomplete="off"></label>
        <div class="row"><button type="submit">Save model</button><button type="button" class="q" id="test">Test connection</button></div>
        <p class="note" id="model-note" role="status"></p>
      </form>
    </section>
    <section class="card">
      <h2>Site Memory</h2>
      <p class="muted" id="memory-now"></p>
      <div class="row" style="margin-top:12px"><button type="button" id="reindex">Rebuild from the site</button></div>
      <p class="note" id="memory-note" role="status"></p>
      <ul class="pages" id="pages"></ul>
    </section>
  </aside>
</main>
<script>
const token = location.hash.slice(1);
const $ = (id) => document.getElementById(id);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}
async function api(path, body) {
  const res = await fetch("/api/" + path, { method: body ? "POST" : "GET", headers: { "x-intent0-token": token, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed (" + res.status + ")");
  return data;
}
function note(id, text, kind) { const el = $(id); el.textContent = text; el.className = "note " + (kind || ""); }
let state;
async function load() {
  try { state = await api("state"); } catch (e) { document.querySelector("main").replaceChildren(h("p", { class: "issues" }, e.message)); return; }
  const m = state.manifest;
  $("site").replaceChildren("intent0 dashboard", h("small", {}, m && m.site ? m.site.name + " · " + m.site.baseUrl : "No manifest"));
  const status = $("status");
  status.replaceChildren();
  if (state.issues.length) status.append(h("span", { class: "pill draft" }, "Manifest has problems"));
  else if (m.status === "approved") status.append(h("span", { class: "pill ok" }, "Approved · revision " + m.revision));
  else status.append(h("span", { class: "pill draft" }, "Draft: visitors see nothing until you approve"), h("button", { type: "button", onclick: approve }, "Approve"));

  const tasks = $("tasks");
  tasks.replaceChildren();
  if (state.issues.length) tasks.append(h("div", { class: "issues" }, h("p", {}, "Fix these in intent0.manifest.json, then reload:"), h("ul", {}, state.issues.map((i) => h("li", {}, i)))));
  else if (!m.flows.length) tasks.append(h("p", { class: "muted" }, "No tasks: intent0 answers questions from your content (Site Memory) only."));
  else for (const f of m.flows) tasks.append(taskRow(f));

  const mo = state.model;
  $("model-now").textContent = mo.model ? "Using " + mo.model + (mo.baseUrl ? " via " + mo.baseUrl : "") + (mo.keySet ? " (key saved)" : " (no key saved)") : "No model set.";
  const sel = $("provider");
  if (!sel.options.length) for (const name of Object.keys(state.presets)) sel.append(h("option", { value: name }, name));
  const match = Object.entries(state.presets).find(([, p]) => p.baseUrl && p.baseUrl === mo.baseUrl);
  sel.value = match ? match[0] : "custom";
  $("model").value = mo.model || "";
  $("baseUrl").value = mo.baseUrl || "";

  const mem = state.memory;
  $("memory-now").textContent = mem ? mem.pages + " pages, " + mem.sections + " sections, built " + new Date(mem.builtAt).toLocaleString() + (mem.topics.length ? ". Topics: " + mem.topics.join(", ") : "") : "Not built yet.";
  $("pages").replaceChildren(...(mem ? mem.list.map((p) => h("li", {}, p.title + " ", h("span", { class: "muted" }, p.url))) : []));
}
function taskRow(f) {
  const tags = [f.auth === "signed_in" ? "needs sign-in" : "public", f.steps.length + (f.steps.length === 1 ? " step" : " steps")];
  const toggle = h("input", { type: "checkbox", checked: f.enabled, "aria-label": "Offer " + f.title, onchange: (e) => change({ id: f.id, enabled: e.target.checked }, e.target) });
  return h("div", { class: "task", "data-off": !f.enabled },
    h("div", { class: "task-head" }, h("span", { class: "task-title" }, f.title), h("label", { class: "switch" }, f.enabled ? "On" : "Off", toggle)),
    h("p", { class: "desc" }, f.description),
    h("div", { class: "tags" }, tags.map((t) => h("span", { class: "tag" }, t)), f.irreversible ? h("span", { class: "tag warn" }, "can't be undone: asks to confirm") : null),
    h("details", {}, h("summary", {}, "Steps and endpoints"), h("ol", {}, f.steps.map((s) => h("li", {}, s.title + " ", s.action ? h("code", {}, s.action.method + " " + s.action.path) : h("span", {}, "(no action)")))), h("p", { class: "muted" }, "If anything fails, visitors go to ", h("code", {}, f.fallbackPath))),
    f.alsoNeed ? h("label", { class: "also" }, h("input", { type: "checkbox", checked: f.alsoNeed.approved, onchange: (e) => change({ id: f.id, alsoNeedApproved: e.target.checked }, e.target) }), h("span", {}, "Show after finishing: “" + f.alsoNeed.text + "”")) : null);
}
async function change(body, input) {
  input.disabled = true;
  try { await api("flow", body); } catch (e) { alert(e.message); }
  await load();
}
async function approve() { try { await api("approve", {}); } catch (e) { alert(e.message); } load(); }
$("provider").addEventListener("change", (e) => { const p = state.presets[e.target.value]; if (p && p.baseUrl) { $("baseUrl").value = p.baseUrl; $("model").value = p.model; } });
$("model-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  note("model-note", "Saving…");
  try { const r = await api("model", data); e.target.apiKey.value = ""; note("model-note", "Saved. " + (r.restart || ""), "ok"); load(); }
  catch (err) { note("model-note", err.message, "bad"); }
});
$("test").addEventListener("click", async () => {
  note("model-note", "Asking the model…");
  try { const r = await api("test-model", {}); note("model-note", "The model answered in " + (r.ms / 1000).toFixed(1) + " s.", "ok"); }
  catch (err) { note("model-note", err.message, "bad"); }
});
$("reindex").addEventListener("click", async (e) => {
  e.target.disabled = true;
  note("memory-note", "Reading your docs and pages… this can take a minute.");
  try { const r = await api("index", {}); note("memory-note", "Done: " + r.pages + " pages, " + r.sections + " sections." + (r.crawled ? "" : " Your site wasn't running at " + r.site + ", so only files in the repo were read."), "ok"); }
  catch (err) { note("memory-note", err.message, "bad"); }
  e.target.disabled = false;
  load();
});
if (!token) document.querySelector("main").replaceChildren(h("p", { class: "issues" }, "Open the dashboard from the link printed by npx intent0 dashboard."));
else load();
</script>
</body>
</html>
`;
