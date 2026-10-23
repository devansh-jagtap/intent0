"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
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
import { readSiteLook, type SiteLook } from "./site-look";
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

// The Web Speech API (Chrome, Edge, Safari). Typed loosely: it isn't in TypeScript's DOM types everywhere.
interface SpeechResultList {
  length: number;
  [i: number]: { isFinal: boolean; 0?: { transcript: string } };
}
interface Recognizer {
  lang: string;
  interimResults: boolean;
  onresult: (ev: { results: SpeechResultList }) => void;
  onerror: (ev: { error: string }) => void;
  onend: () => void;
  start(): void;
}
function speechRecognition(): (new () => Recognizer) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, (new () => Recognizer) | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
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
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const [look, setLook] = useState<SiteLook>();
  // The generated page replaces the "generating" screen; between steps of a task it stays up.
  const [hasPage, setHasPage] = useState(false);
  const [genUntil, setGenUntil] = useState(0);
  const [, setNow] = useState(0);
  const [status, setStatus] = useState(0);
  const [headerH, setHeaderH] = useState(0);
  const scrollBefore = useRef(0);
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
    setCanSpeak(Boolean(speechRecognition()));
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

  // While the layer is over the site, the site behind it doesn't scroll. The site's look is read
  // fresh each time it opens. Focus moves into the layer on open and back to the launcher on close.
  useEffect(() => {
    if (open) {
      setLook(readSiteLook());
      inputRef.current?.focus();
      scrollBefore.current = window.scrollY;
      const before = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      wasOpen.current = true;
      return () => {
        document.documentElement.style.overflow = before;
        window.scrollTo({ top: scrollBefore.current });
      };
    }
    if (wasOpen.current) launcherRef.current?.focus();
  }, [open]);

  // "Generating your experience" stays at least a moment, so the page arrives rather than flickers.
  const holding = Date.now() < genUntil;
  useEffect(() => {
    const left = genUntil - Date.now();
    if (left <= 0) return;
    const t = setTimeout(() => setNow(Date.now()), left + 10);
    return () => clearTimeout(t);
  }, [genUntil, phase.kind]);
  const view: "ask" | "gen" | "page" = phase.kind === "idle" ? "ask" : !hasPage && (phase.kind === "thinking" || holding) ? "gen" : "page";
  useEffect(() => {
    if (view !== "gen") return setStatus(0);
    const t = setInterval(() => setStatus((n) => n + 1), 1300);
    return () => clearInterval(t);
  }, [view]);
  // The page opens under the site's own header, so it reads as one of the site's pages.
  useEffect(() => {
    if (!open || view !== "page") return;
    if (!hasPage) setHasPage(true);
    window.scrollTo({ top: 0 });
    setHeaderH(look ? look.chromeHeight() : 0);
  }, [open, view, look, hasPage]);

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
    setAsked((a) => a || flow.title);
    if (phase.kind !== "step") {
      setHasPage(false);
      setGenUntil(Date.now() + 1400);
    }
    setError(undefined);
    setFieldErrors({});
    // Details remembered in this tab fill the form first; what the visitor just said wins.
    const names = new Set(flow.steps.flatMap((s) => s.fields.map((f) => f.name)));
    const known = Object.fromEntries(Object.entries(readRemembered()).filter(([k]) => names.has(k)));
    await showStep(startFlow(manifest, flowId, { ...known, ...prefill }));
  }

  async function answer(query: string) {
    setRun(undefined);
    setPhase({ kind: "thinking", label: "Finding the right pages" });
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
    await askFor(text);
  }

  /** Voice: the browser turns speech into text (nothing is recorded by intent0), then it's asked like typed text. */
  function listen() {
    const Recognition = speechRecognition();
    if (!Recognition || listening) return;
    const rec = new Recognition();
    rec.lang = lang === "hi" ? "hi-IN" : navigator.language || "en-US";
    rec.interimResults = true;
    rec.onresult = (ev) => {
      const said = Array.from(ev.results, (r) => r[0]?.transcript ?? "").join("");
      setText(said);
      if (ev.results[ev.results.length - 1]?.isFinal) void askFor(said);
    };
    rec.onerror = (ev) => {
      if (ev.error === "not-allowed") setError("Allow the microphone to ask by voice, or type your question.");
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function askFor(value: string) {
    const text = value.trim();
    if (!text) return;
    setAsked(text);
    setError(undefined);
    setRun(undefined);
    setHasPage(false);
    setGenUntil(Date.now() + 1800);
    setPhase({ kind: "thinking", label: "Reading your request" });
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
    setText("");
    setHasPage(false);
    setTimeout(() => inputRef.current?.focus(), 0);
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
  const suggestions = manifest.flows.slice(0, 6);
  const siteName = manifest.site.name;
  const placeholder = manifest.flows.length ? `For example, “${manifest.flows[0]!.title.toLowerCase()}”` : "Ask anything about this site";
  const statusLines = [phase.kind === "thinking" ? phase.label : "Reading your request", "Finding the right pages", `Building your page in ${siteName}'s look`];

  const closeButton = (
    <button type="button" className="i0-x" onClick={() => setOpen(false)} aria-label="Close">
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>
        <path d="M3.5 3.5l9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );

  return (
    <div className="i0-layer" data-theme={look?.dark ? "dark" : "light"} style={look?.vars as CSSProperties}>
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

      {open && (
        <div
          className="i0-screen"
          data-view={view}
          role="dialog"
          aria-modal="true"
          aria-label={view === "page" && content ? content.page.title : "Ask this site"}
          style={view === "page" && headerH ? { top: headerH } : undefined}
          // Following a link to the site's own page (a cited source, the fallback) reveals the site.
          onClick={(e) => {
            const a = (e.target as HTMLElement).closest("a[href]");
            if (a && a.getAttribute("target") !== "_blank") setOpen(false);
          }}
        >
          {/* 1. Say what you need: one big question on a calm screen in the site's colours. */}
          {view === "ask" && (
            <div className="i0-ask">
              <div className="i0-ask-top">
                <span>{siteName}</span>
                {closeButton}
              </div>
              <div className="i0-ask-main">
                <h2 className="i0-ask-title">What do you need?</h2>
                <form onSubmit={onIntent} className="i0-ask-row" role="search">
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={placeholder}
                    aria-label="What do you need?"
                    className="i0-intent"
                  />
                  {canSpeak && (
                    <button
                      type="button"
                      className="i0-mic"
                      onClick={listen}
                      data-on={listening ? "" : undefined}
                      aria-label={listening ? "Listening…" : "Ask by voice"}
                      title={listening ? "Listening…" : "Ask by voice"}
                    >
                      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
                        <rect x="7" y="2.5" width="6" height="10" rx="3" fill="currentColor" />
                        <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                  <ui.Button type="submit" data-i0-primary="">
                    Build my page
                  </ui.Button>
                </form>
                {error && (
                  <p role="alert" className="i0-alert">
                    {error}
                  </p>
                )}
                {suggestions.length > 0 && (
                  <div className="i0-ask-more">
                    <p className="i0-muted">Things you can do here</p>
                    <div className="i0-suggest">
                      {suggestions.map((f) => (
                        <button key={f.id} type="button" className="i0-chip" onClick={() => begin(f.id)}>
                          {f.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {config.content && <p className="i0-muted i0-ask-hint">Or ask anything about {siteName}. A page is built just for your question, from this site's own pages.</p>}
              </div>
            </div>
          )}

          {/* 2. Generating your experience: the screen goes dark while the page is made. */}
          {view === "gen" && (
            <div className="i0-gen" role="status" aria-live="polite">
              <div className="i0-gen-art" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <p className="i0-gen-title">Generating your experience</p>
              <p className="i0-gen-status" key={status}>
                {statusLines[status % statusLines.length]}
              </p>
              {asked && (
                <p className="i0-gen-asked">
                  <q>{asked}</q>
                </p>
              )}
            </div>
          )}

          {/* 3. The page made for this request, in the site's own look. */}
          {view === "page" && (
            <div className="i0-pageview" ref={scrollRef}>
              <div className="i0-pagebar">
                <p className="i0-pagebar-asked">
                  Made for you: <q>{asked}</q>
                </p>
                <div className="i0-pagebar-actions">
                  <button type="button" className="i0-quiet" onClick={clear}>
                    New request
                  </button>
                  {closeButton}
                </div>
              </div>

              <div className="i0-wrap" aria-live="polite">
                {error && (
                  <p role="alert" className="i0-alert">
                    {error}
                  </p>
                )}

                {phase.kind === "thinking" && (
                  <p className="i0-thinking" role="status">
                    <span className="i0-dot" aria-hidden /> {phase.label}…
                  </p>
                )}

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

                {(phase.kind === "step" || (phase.kind === "thinking" && run && !run.done)) && step && run && flow && (
                  <article className="i0-page">
                    <header className="i0-hero">
                      <h1 className="i0-title i0-in">{flow.title}</h1>
                      {flow.description && <p className="i0-lead i0-in">{flow.description}</p>}
                      {flow.steps.length > 1 && (
                        <ol className="i0-flow-steps i0-in" aria-label="Steps">
                          {flow.steps.map((s, i) => {
                            const state = i < run.stepIndex ? "done" : i === run.stepIndex ? "current" : "todo";
                            return (
                              <li key={s.id} data-state={state}>
                                <span className="i0-guide-n">{state === "done" ? "✓" : i + 1}</span>
                                <span>{s.title}</span>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </header>
                    {phase.kind === "step" && (
                      <form ref={formRef} onSubmit={onStepSubmit} className="i0-form i0-card i0-in" key={`${run.flowId}:${step.id}`} noValidate={!lastPart}>
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
                            <ui.Button type="submit" disabled={busy} data-i0-primary="">
                              {busy ? "Sending…" : submitLabel(phase.page)}
                            </ui.Button>
                          ) : (
                            <ui.Button type="button" onClick={() => nextPart(parts)} data-i0-primary="">
                              Next
                            </ui.Button>
                          )}
                          {part > 0 ? (
                            <button type="button" className="i0-quiet" onClick={() => setPart(part - 1)}>
                              Back
                            </button>
                          ) : run.stepIndex > 0 ? (
                            <button type="button" className="i0-quiet" onClick={() => showStep(goBack(run))}>
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
                  </article>
                )}

                {phase.kind === "done" && run && flow && (
                  <article className="i0-page">
                    <header className="i0-hero">
                      <p className="i0-done-badge i0-in">
                        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Done
                      </p>
                      <h1 className="i0-title i0-in">{flow.title}</h1>
                    </header>
                    <div className="i0-done i0-card i0-in">
                      {(flow.steps.at(-1)?.action?.returns ?? [])
                        // Show simple values only (text, numbers); lists like a status history stay on the site's own pages.
                        .filter((k) => ["string", "number"].includes(typeof run.outputs[k]))
                        .map((k) => (
                          <p key={k} className="i0-ref">
                            <span className="i0-muted">{humanize(k)}</span>
                            <b>{String(run.outputs[k])}</b>
                          </p>
                        ))}
                    </div>
                    {flow.alsoNeed?.approved && (
                      <div className="i0-also i0-in">
                        <p className="i0-h3">You may also need</p>
                        <p className="i0-text">{flow.alsoNeed.text}</p>
                      </div>
                    )}
                  </article>
                )}

                {phase.kind === "nomatch" && (
                  <article className="i0-page">
                    <header className="i0-hero">
                      <h1 className="i0-title i0-in">This site can't do that here</h1>
                      <p className="i0-lead i0-in">These are the things {siteName} can help with:</p>
                    </header>
                    <div className="i0-suggest i0-in">
                      {suggestions.map((f) => (
                        <button key={f.id} type="button" className="i0-chip" onClick={() => begin(f.id)}>
                          {f.title}
                        </button>
                      ))}
                    </div>
                  </article>
                )}

                {phase.kind === "notfound" && (
                  <article className="i0-page">
                    <header className="i0-hero">
                      <h1 className="i0-title i0-in">Nothing on {siteName} about this</h1>
                      <p className="i0-lead i0-in">{phase.message} Try different words, or use the site's own menu.</p>
                    </header>
                  </article>
                )}

                {phase.kind === "fallback" && (
                  <p className="i0-text">
                    This page couldn't be prepared ({phase.reason}). Taking you to the site's own page… <a href={phase.url}>Go now</a>
                  </p>
                )}

                {content && citeOrder.length > 0 && (
                  <nav className="i0-sources i0-in" aria-label="Sources">
                    <p className="i0-sources-title">Everything on this page comes from {siteName}</p>
                    <ol>
                      {citeOrder.map((id, i) => {
                        const s = content.sources.sections[id];
                        return s ? (
                          <li key={id}>
                            <a href={sourceHref(s)}>
                              <span className="i0-src-n">{i + 1}</span>
                              <span>
                                {s.page}
                                <small>{s.heading.split(" › ").slice(1).join(" › ") || s.heading}</small>
                              </span>
                            </a>
                          </li>
                        ) : null;
                      })}
                    </ol>
                  </nav>
                )}

                <div className="i0-foot">
                  <span>Built by intent0 for this request{config.mode === "mock" ? " (no AI model configured)" : ""}</span>
                  {remembered && (
                    <button type="button" className="i0-quiet" onClick={forget}>
                      Forget my details
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
