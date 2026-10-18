"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  FlowError,
  buildRequest,
  completeStep,
  currentStep,
  fallbackUrl,
  findFlow,
  goBack,
  startFlow,
  validatePage,
  withFallback,
  type FlowRun,
} from "@intent0/core";
import { ComponentCatalog, ContentPage, Manifest, type Field, type PageSpec } from "@intent0/schema";
import { resolveKit, type Intent0Kit } from "./kit";
import { ContentView, FIELDS_PER_PART, FormView, boundFields, citationOrder, sourceHref, submitLabel, type Sources } from "./renderer";
import { INTENT0_CSS } from "./styles";
import { registerBrowserTools } from "./webmcp";

type Phase =
  | { kind: "idle" }
  | { kind: "thinking"; label: string }
  | { kind: "nomatch" }
  | { kind: "step"; page: PageSpec }
  | { kind: "content"; page: ContentPage; sources: Sources }
  | { kind: "notfound"; message: string }
  | { kind: "done" }
  | { kind: "fallback"; url: string; reason: string };

interface Config {
  manifest: Manifest;
  catalog: ComponentCatalog;
  mode: string;
  content: { pages: number; sections: number } | null;
}

export interface Intent0LayerProps {
  /** Where the site mounted the adapter. */
  endpoint?: string;
  /** The site's own components. */
  kit?: Intent0Kit;
  lang?: string;
}

/** "referenceId" / "reference_id" → "Reference ID" for the result screen. */
const humanize = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\bid\b/gi, "ID")
    .replace(/^./, (c) => c.toUpperCase());

/** Same-origin path for a manifest URL, so the layer works on any host or port. */
const sitePath = (url: string) => {
  const u = new URL(url);
  return `${u.pathname}${u.search}`;
};

// Details the visitor typed, kept only in this browser tab so other tasks can be pre-filled.
// Never sent anywhere except to the site's own endpoints, as part of the forms they fill.
const MEMORY_KEY = "intent0:details";
const REMEMBER: Field["type"][] = ["text", "email", "phone", "date", "select", "radio", "textarea", "number"];
function readRemembered(): Record<string, unknown> {
  try {
    return JSON.parse(sessionStorage.getItem(MEMORY_KEY) ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}
function writeRemembered(values: Record<string, unknown>) {
  try {
    if (Object.keys(values).length) sessionStorage.setItem(MEMORY_KEY, JSON.stringify(values));
    else sessionStorage.removeItem(MEMORY_KEY);
  } catch {
    /* storage blocked: nothing is remembered */
  }
}

/** Dark host page → dark layer. */
function hostIsDark(): boolean {
  for (const el of [document.body, document.documentElement]) {
    const m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(getComputedStyle(el).backgroundColor);
    if (m && (m[4] === undefined || Number(m[4]) > 0.5)) return 0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3]) < 100;
  }
  return false;
}

async function postJson(url: string, body: unknown, signal?: AbortSignal) {
  const res = await fetch(url, { method: "POST", signal, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `request failed (${res.status})`);
  return data;
}

/** Calls the site's own backend endpoint (a same-origin path) for a step, exactly as the manifest says. */
async function callSiteAction(method: string, path: string, body: Record<string, unknown>) {
  let res: Response;
  if (method === "GET") {
    const u = new URL(path, window.location.origin);
    for (const [k, v] of Object.entries(body)) u.searchParams.set(k, String(v));
    res = await fetch(u, { credentials: "same-origin" });
  } else if (Object.values(body).some((v) => v instanceof File)) {
    const form = new FormData();
    for (const [k, v] of Object.entries(body)) form.set(k, v instanceof File ? v : String(v));
    res = await fetch(path, { method, body: form, credentials: "same-origin" });
  } else {
    res = await fetch(path, { method, body: JSON.stringify(body), headers: { "content-type": "application/json" }, credentials: "same-origin" });
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export function Intent0Layer({ endpoint = "/intent0", kit, lang = "en" }: Intent0LayerProps) {
  const ui = useMemo(() => resolveKit(kit), [kit]);
  const [config, setConfig] = useState<Config>();
  const [text, setText] = useState("");
  const [asked, setAsked] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [run, setRun] = useState<FlowRun>();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [part, setPart] = useState(0);
  const [open, setOpen] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const [dark, setDark] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch(`${endpoint}/config`)
      .then((r) => r.json())
      .then((c: { manifest: unknown; catalog: unknown; mode: string; content?: Config["content"] }) =>
        setConfig({ manifest: Manifest.parse(c.manifest), catalog: ComponentCatalog.parse(c.catalog), mode: c.mode, content: c.content ?? null }),
      )
      .catch((e) => console.error("[intent0] could not load config", e));
    setDark(hostIsDark());
    setRemembered(Object.keys(readRemembered()).length > 0);
  }, [endpoint]);

  // Browser AI agents (WebMCP) get the same approved tasks and search, in the visitor's own session.
  useEffect(() => {
    if (!config) return;
    return registerBrowserTools(config.manifest, endpoint, Boolean(config.content), callSiteAction);
  }, [config, endpoint]);

  // Ctrl/⌘+K opens the panel; Esc hides it (what was asked stays until cleared).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      } else if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // While the panel is over the site, the site behind it doesn't scroll. Focus moves into the
  // panel on open and back to the launcher on close.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      const before = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      wasOpen.current = true;
      return () => {
        document.documentElement.style.overflow = before;
      };
    }
    if (wasOpen.current) launcherRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [phase.kind, part]);

  // Nothing to offer (no approved tasks and no content): leave the site as it is.
  if (!config || (config.manifest.flows.length === 0 && !config.content)) return null;
  const { manifest, catalog } = config;

  function goToFallback(flowId: string, reason: string) {
    const url = sitePath(fallbackUrl(manifest, flowId));
    setPhase({ kind: "fallback", url, reason });
    setTimeout(() => (window.location.href = url), 2500);
  }

  /** Asks the adapter to generate the page for the run's current step, checks it, then shows it. */
  async function showStep(next: FlowRun) {
    const step = currentStep(manifest, next);
    setRun(next);
    setConfirmed(false);
    setPart(0);
    setPhase({ kind: "thinking", label: `Preparing “${step.title}”` });
    const outcome = await withFallback(
      async (signal) => (await postJson(`${endpoint}/generate`, { flowId: next.flowId, stepId: step.id, lang }, signal)).page as PageSpec,
      { timeoutMs: 25_000, fallbackUrl: fallbackUrl(manifest, next.flowId), check: (p) => validatePage(p, manifest, catalog) },
    );
    if (outcome.kind === "ok") setPhase({ kind: "step", page: outcome.value });
    else goToFallback(next.flowId, `${outcome.reason}: ${outcome.detail.join("; ")}`);
  }

  async function begin(flowId: string, prefill: Record<string, unknown> = {}) {
    const flow = findFlow(manifest, flowId);
    if (!flow) return;
    if (!asked) setAsked(flow.title);
    setError(undefined);
    setFieldErrors({});
    // Details remembered in this tab fill the form first; what the visitor just said wins.
    const names = new Set(flow.steps.flatMap((s) => s.fields.map((f) => f.name)));
    const known = Object.fromEntries(Object.entries(readRemembered()).filter(([k]) => names.has(k)));
    await showStep(startFlow(manifest, flowId, { ...known, ...prefill }));
  }

  async function answer(query: string) {
    setRun(undefined);
    setPhase({ kind: "thinking", label: "Looking through this site" });
    try {
      const r = await postJson(`${endpoint}/answer`, { query, lang });
      if (!r.page) return setPhase({ kind: "notfound", message: typeof r.message === "string" ? r.message : "I couldn't find this on the website." });
      setPhase({ kind: "content", page: ContentPage.parse(r.page), sources: r.sources as Sources });
    } catch (err) {
      setError((err as Error).message);
      setPhase({ kind: "idle" });
    }
  }

  async function onIntent(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setAsked(text.trim());
    setError(undefined);
    setRun(undefined);
    setPhase({ kind: "thinking", label: "Understanding what you need" });
    try {
      const r = await postJson(`${endpoint}/resolve`, { text });
      if (r.kind === "content" && typeof r.query === "string") await answer(r.query);
      else if (typeof r.flowId === "string") await begin(r.flowId, (r.prefill as Record<string, unknown>) ?? {});
      else setPhase({ kind: "nomatch" });
    } catch (err) {
      setError((err as Error).message);
      setPhase({ kind: "idle" });
    }
  }

  /** Long forms: check the visible part before moving on. */
  function nextPart(total: number) {
    const fields = formRef.current?.querySelectorAll<HTMLInputElement>(
      "[data-part-field]:not([hidden]) input, [data-part-field]:not([hidden]) select, [data-part-field]:not([hidden]) textarea",
    );
    for (const el of fields ?? []) if (!el.reportValidity()) return;
    setPart((p) => Math.min(total - 1, p + 1));
  }

  async function onStepSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!run) return;
    // Enter in an early part of a long form moves on; only the last part submits.
    if (!lastPart) return nextPart(parts);
    const step = currentStep(manifest, run);
    const flow = findFlow(manifest, run.flowId)!;
    const isFinal = run.stepIndex === flow.steps.length - 1;
    if (flow.irreversible && isFinal && !confirmed) {
      setError("Please confirm before submitting. This can't be undone.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const values: Record<string, unknown> = {};
    for (const f of step.fields) {
      const v = form.get(f.name);
      // Send real types, as the site's own forms would: a ticked box is true, numbers are numbers.
      if (f.type === "checkbox") values[f.name] = v !== null;
      else if (v instanceof File) {
        if (v.size > 0) values[f.name] = v;
      } else if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v.trim());
        values[f.name] = f.type === "number" && Number.isFinite(n) ? n : v.trim();
      }
    }

    const available: Record<string, unknown> = { ...run.values, ...values, ...run.outputs };
    const request = buildRequest(manifest, run.flowId, step.id, available);
    if (!request) return goToFallback(run.flowId, "no approved action for this step");
    if ("error" in request) {
      setError(`Please fill in all required details (${request.error}).`);
      return;
    }

    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    const res = await callSiteAction(request.method, request.path, request.body);
    setBusy(false);

    if (!res.ok) {
      const msg = res.data.error ?? res.data.message;
      setError(typeof msg === "string" ? msg : `The website rejected this step (${res.status}).`);
      const fe = (res.data.fieldErrors ?? res.data.errors) as Record<string, string[] | string> | undefined;
      setFieldErrors(fe && typeof fe === "object" ? Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, Array.isArray(v) ? v : [String(v)]])) : {});
      // Jump to the part that holds the first rejected field.
      const first = fe && Object.keys(fe)[0];
      if (first && phase.kind === "step") {
        const i = boundFields(phase.page.blocks).indexOf(first);
        if (i >= 0) setPart(Math.floor(i / FIELDS_PER_PART));
      }
      return;
    }
    // Remember plain details (not files, OTPs or checkboxes) in this tab for the next task.
    const keep = Object.fromEntries(step.fields.filter((f) => REMEMBER.includes(f.type) && values[f.name] !== undefined).map((f) => [f.name, values[f.name]]));
    if (Object.keys(keep).length) {
      writeRemembered({ ...readRemembered(), ...keep });
      setRemembered(true);
    }
    try {
      const next = completeStep(manifest, run, { values, outputs: res.data });
      if (next.done) {
        setRun(next);
        setPhase({ kind: "done" });
      } else await showStep(next);
    } catch (err) {
      setError(err instanceof FlowError ? err.message : "Something went wrong.");
    }
  }

  function clear() {
    setPhase({ kind: "idle" });
    setRun(undefined);
    setError(undefined);
    setAsked("");
  }

  function forget() {
    writeRemembered({});
    setRemembered(false);
  }

  const flow = run ? findFlow(manifest, run.flowId) : undefined;
  const step = run && !run.done ? currentStep(manifest, run) : undefined;
  const isFinalIrreversible = Boolean(flow && run && flow.irreversible && run.stepIndex === flow.steps.length - 1);

  // Long single steps are split into parts of a few fields each.
  const order = phase.kind === "step" ? boundFields(phase.page.blocks) : [];
  const parts = order.length > FIELDS_PER_PART + 1 ? Math.ceil(order.length / FIELDS_PER_PART) : 1;
  const partOf = (name: string) => (parts === 1 ? 0 : Math.floor(Math.max(0, order.indexOf(name)) / FIELDS_PER_PART));
  const lastPart = part >= parts - 1;

  const content = phase.kind === "content" ? phase : null;
  const citeOrder = content ? citationOrder(content.page) : [];
  const rail =
    flow && flow.steps.length > 1 && (phase.kind === "step" || phase.kind === "done" || phase.kind === "thinking")
      ? "steps"
      : content && citeOrder.length
        ? "sources"
        : "none";

  const suggestions = manifest.flows.slice(0, 6);
  const placeholder = manifest.flows.length ? `What do you want to do? For example, “${manifest.flows[0]!.title.toLowerCase()}”` : "What are you looking for?";

  return (
    <div className="i0-layer" data-theme={dark ? "dark" : "light"}>
      <style>{INTENT0_CSS}</style>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          className="i0-launch"
          onClick={() => setOpen(true)}
          aria-label="Ask this site"
          title="Ask this site (Ctrl K)"
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12.6 12.6 17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Ask this site</span>
          {phase.kind !== "idle" && <span className="i0-launch-dot" aria-hidden />}
        </button>
      )}

      {open && <div className="i0-scrim" onClick={() => setOpen(false)} aria-hidden />}
      {open && (
        <div
          className="i0-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Ask this site"
          data-wide={phase.kind !== "idle" ? "" : undefined}
          // Following a link to the site's own page (a cited source, the fallback) reveals the site.
          onClick={(e) => {
            const a = (e.target as HTMLElement).closest("a[href]");
            if (a && a.getAttribute("target") !== "_blank") setOpen(false);
          }}
        >
          <div className="i0-panel-head">
            <p className="i0-panel-title">Ask this site</p>
            <button type="button" className="i0-x" onClick={() => setOpen(false)} aria-label="Close">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                <path d="M3.5 3.5l9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="i0-bar">
            <form onSubmit={onIntent} className="i0-row" role="search">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                aria-label="What do you want to do?"
                className="i0-intent"
              />
              <ui.Button type="submit" disabled={phase.kind === "thinking"}>
                Ask
              </ui.Button>
            </form>
          </div>

          <div className="i0-scroll" ref={scrollRef}>
            {phase.kind === "idle" && (
              <div className="i0-idle">
                {error && (
                  <p role="alert" className="i0-alert">
                    {error}
                  </p>
                )}
                {suggestions.length > 0 && (
                  <>
                    <p className="i0-muted">Things you can do here</p>
                    <div className="i0-suggest">
                      {suggestions.map((f) => (
                        <button key={f.id} type="button" className="i0-chip" onClick={() => begin(f.id)}>
                          {f.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {config.content && <p className="i0-muted">Or ask a question about anything on this site.</p>}
              </div>
            )}

            {phase.kind !== "idle" && (
              <div className="i0-sheet">
                <div className="i0-asked">
                  <p className="i0-asked-text">
                    You asked: <q>{asked}</q>
                  </p>
                  <button type="button" onClick={clear} className="i0-link">
                    Clear
                  </button>
                </div>

                <div className="i0-body" data-rail={rail}>
                  {rail === "steps" && flow && run && (
                    <nav className="i0-rail" aria-label="Steps">
                      <ol className="i0-steps">
                        {flow.steps.map((s, i) => {
                          const state = run.done || i < run.stepIndex ? "done" : i === run.stepIndex ? "current" : "todo";
                          return (
                            <li key={s.id} className="i0-step" data-state={state}>
                              <span className="i0-step-n">{state === "done" ? "✓" : i + 1}</span>
                              <span>{s.title}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </nav>
                  )}
                  {rail === "sources" && content && (
                    <nav className="i0-rail" aria-label="Sources">
                      <p style={{ marginBottom: 8 }}>From this site</p>
                      <ol className="i0-sources">
                        {citeOrder.map((id, i) => {
                          const s = content.sources.sections[id];
                          return s ? (
                            <li key={id}>
                              <a href={sourceHref(s)}>
                                <span className="i0-src-n">{i + 1}</span>
                                <span>{s.page}</span>
                                <small>{s.heading}</small>
                              </a>
                            </li>
                          ) : null;
                        })}
                      </ol>
                    </nav>
                  )}

                  <div className="i0-main" aria-live="polite">
                    {error && (
                      <p role="alert" className="i0-alert">
                        {error}
                      </p>
                    )}

                    {phase.kind === "thinking" && (
                      <div className="i0-gen" role="status">
                        <p className="i0-gen-title">Generating your experience</p>
                        <p className="i0-thinking">
                          <span className="i0-dot" aria-hidden /> {phase.label}…
                        </p>
                        <div className="i0-skel" aria-hidden>
                          <span style={{ width: "55%", height: 22 }} />
                          <span style={{ width: "92%" }} />
                          <span style={{ width: "84%" }} />
                          <span style={{ width: "70%" }} />
                          <span style={{ width: "100%", height: 72 }} />
                        </div>
                      </div>
                    )}

                    {phase.kind === "nomatch" && (
                      <div className="i0-section">
                        <p className="i0-text">This website can't do that here. These are the things it can help with:</p>
                        <div className="i0-suggest">
                          {suggestions.map((f) => (
                            <button key={f.id} type="button" className="i0-chip" onClick={() => begin(f.id)}>
                              {f.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {phase.kind === "notfound" && <p className="i0-text">{phase.message} Try different words, or use the site's own menu.</p>}

                    {content && (
                      <ContentView
                        page={content.page}
                        sources={content.sources}
                        order={citeOrder}
                        kit={ui}
                        taskTitle={(id) => findFlow(manifest, id)?.title}
                        onStartTask={(id) => begin(id)}
                      />
                    )}

                    {phase.kind === "step" && step && run && flow && (
                      <form ref={formRef} onSubmit={onStepSubmit} className="i0-form" key={`${run.flowId}:${step.id}`} noValidate={!lastPart}>
                        <FormView
                          page={phase.page}
                          step={step}
                          values={run.values}
                          fieldErrors={fieldErrors}
                          kit={ui}
                          busy={busy}
                          part={part}
                          partOf={partOf}
                        />
                        {isFinalIrreversible && lastPart && (
                          <label className="i0-confirm">
                            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                            <span>I confirm these details are correct and want to submit. This can't be undone.</span>
                          </label>
                        )}
                        <div className="i0-actions">
                          {lastPart ? (
                            <ui.Button type="submit" disabled={busy}>
                              {busy ? "Sending…" : submitLabel(phase.page)}
                            </ui.Button>
                          ) : (
                            <ui.Button type="button" onClick={() => nextPart(parts)}>
                              Next
                            </ui.Button>
                          )}
                          {part > 0 ? (
                            <button type="button" className="i0-link" onClick={() => setPart(part - 1)}>
                              Back
                            </button>
                          ) : run.stepIndex > 0 ? (
                            <button type="button" className="i0-link" onClick={() => showStep(goBack(run))}>
                              Back
                            </button>
                          ) : null}
                          {parts > 1 && (
                            <span className="i0-part">
                              Part {part + 1} of {parts}
                            </span>
                          )}
                        </div>
                      </form>
                    )}

                    {phase.kind === "done" && run && flow && (
                      <div className="i0-done">
                        <p className="i0-ok">{flow.title}: done</p>
                        {(flow.steps.at(-1)?.action?.returns ?? [])
                          // Show simple values only (text, numbers); lists like a status history stay on the site's own pages.
                          .filter((k) => ["string", "number"].includes(typeof run.outputs[k]))
                          .map((k) => (
                            <p key={k} className="i0-ref">
                              <span className="i0-muted">{humanize(k)}</span>
                              <b>{String(run.outputs[k])}</b>
                            </p>
                          ))}
                        {flow.alsoNeed?.approved && (
                          <div className="i0-also">
                            <p className="i0-h3">You may also need</p>
                            <p className="i0-text">{flow.alsoNeed.text}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {phase.kind === "fallback" && (
                      <p className="i0-text">
                        This page couldn't be prepared ({phase.reason}). Taking you to the site's own page… <a href={phase.url}>Go now</a>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="i0-foot">
            <span>Powered by intent0{config.mode === "mock" ? " (no AI model configured)" : ""}</span>
            {remembered && (
              <button type="button" className="i0-link" onClick={forget}>
                Forget my details
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
