"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  FlowError,
  completeStep,
  currentStep,
  fallbackUrl,
  findFlow,
  goBack,
  resolveAction,
  startFlow,
  validatePage,
  withFallback,
  type FlowRun,
} from "@intent0/core";
import { ComponentCatalog, Manifest, type PageSpec } from "@intent0/schema";
import { resolveKit, type Intent0Kit } from "./kit";
import { PageView } from "./renderer";
import { INTENT0_CSS } from "./styles";

type Phase =
  | { kind: "idle" }
  | { kind: "thinking"; label: string }
  | { kind: "nomatch" }
  | { kind: "step"; page: PageSpec }
  | { kind: "done" }
  | { kind: "fallback"; url: string; reason: string };

interface Config {
  manifest: Manifest;
  catalog: ComponentCatalog;
  mode: string;
}

export interface Intent0LayerProps {
  /** Where the site mounted the adapter. */
  endpoint?: string;
  /** The site's own components. */
  kit?: Intent0Kit;
  lang?: string;
}

/** Same-origin path for a manifest URL, so the layer works on any host or port. */
const sitePath = (url: string) => {
  const u = new URL(url);
  return `${u.pathname}${u.search}`;
};

async function postJson(url: string, body: unknown, signal?: AbortSignal) {
  const res = await fetch(url, { method: "POST", signal, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `request failed (${res.status})`);
  return data;
}

/** Calls the site's own backend endpoint for a step, exactly as the manifest says. */
async function callSiteAction(method: string, url: string, body: Record<string, unknown>) {
  const path = sitePath(url);
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
    res = await fetch(path, {
      method,
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
    });
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export function Intent0Layer({ endpoint = "/intent0", kit, lang = "en" }: Intent0LayerProps) {
  const ui = useMemo(() => resolveKit(kit), [kit]);
  const [config, setConfig] = useState<Config>();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [run, setRun] = useState<FlowRun>();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${endpoint}/config`)
      .then((r) => r.json())
      .then((c: { manifest: unknown; catalog: unknown; mode: string }) =>
        setConfig({ manifest: Manifest.parse(c.manifest), catalog: ComponentCatalog.parse(c.catalog), mode: c.mode }),
      )
      .catch((e) => console.error("[intent0] could not load config", e));
  }, [endpoint]);

  useEffect(() => {
    if (phase.kind !== "idle") panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [phase.kind]);

  // Nothing approved yet (or config failed): show nothing, leave the site as it is.
  if (!config || config.manifest.flows.length === 0) return null;
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
    setPhase({ kind: "thinking", label: `Building “${step.title}”…` });
    const outcome = await withFallback(
      async (signal) => (await postJson(`${endpoint}/generate`, { flowId: next.flowId, stepId: step.id, lang }, signal)).page as PageSpec,
      { timeoutMs: 25_000, fallbackUrl: fallbackUrl(manifest, next.flowId), check: (p) => validatePage(p, manifest, catalog) },
    );
    if (outcome.kind === "ok") setPhase({ kind: "step", page: outcome.value });
    else goToFallback(next.flowId, `${outcome.reason}: ${outcome.detail.join("; ")}`);
  }

  async function begin(flowId: string, prefill: Record<string, unknown> = {}) {
    setError(undefined);
    setFieldErrors({});
    await showStep(startFlow(manifest, flowId, prefill));
  }

  async function onIntent(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(undefined);
    setRun(undefined);
    setPhase({ kind: "thinking", label: "Understanding what you need…" });
    try {
      const r = await postJson(`${endpoint}/resolve`, { text });
      if (typeof r.flowId === "string") await begin(r.flowId, (r.prefill as Record<string, unknown>) ?? {});
      else setPhase({ kind: "nomatch" });
    } catch (err) {
      setError((err as Error).message);
      setPhase({ kind: "idle" });
    }
  }

  async function onStepSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!run) return;
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
      if (v instanceof File) {
        if (v.size > 0) values[f.name] = v;
      } else if (typeof v === "string" && v.trim() !== "") values[f.name] = v.trim();
    }

    const action = resolveAction(manifest, run.flowId, step.id);
    if (!action) return goToFallback(run.flowId, "no approved action for this step");
    const available: Record<string, unknown> = { ...run.values, ...values, ...run.outputs };
    const body = Object.fromEntries(action.sends.filter((k) => available[k] !== undefined).map((k) => [k, available[k]]));

    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    const res = await callSiteAction(action.method, action.url, body);
    setBusy(false);

    if (!res.ok) {
      const msg = res.data.error ?? res.data.message;
      setError(typeof msg === "string" ? msg : `The website rejected this step (${res.status}).`);
      setFieldErrors((res.data.fieldErrors as Record<string, string[]>) ?? {});
      return;
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

  function close() {
    setPhase({ kind: "idle" });
    setRun(undefined);
    setError(undefined);
  }

  const flow = run ? findFlow(manifest, run.flowId) : undefined;
  const step = run && !run.done ? currentStep(manifest, run) : undefined;
  const isFinalIrreversible = flow && run && flow.irreversible && run.stepIndex === flow.steps.length - 1;

  return (
    <div className="i0-layer">
      <style>{INTENT0_CSS}</style>
      <div className="i0-wrap">
        <form onSubmit={onIntent} className="i0-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What do you want to do?"
            aria-label="What do you want to do?"
            className="i0-intent"
          />
          <ui.Button type="submit" disabled={phase.kind === "thinking"}>
            Go
          </ui.Button>
        </form>
        <div className="i0-chips">
          <span className="i0-muted">Or choose:</span>
          {manifest.flows.map((f) => (
            <button key={f.id} type="button" onClick={() => begin(f.id)} className="i0-chip">
              {f.title}
            </button>
          ))}
          <span className="i0-badge">intent0 · {config.mode === "model" ? "live model" : "mock model"}</span>
        </div>
      </div>

      {phase.kind !== "idle" && (
        <div ref={panelRef} className="i0-panelwrap">
          <div className="i0-panel">
            <div className="i0-head">
              <p className="i0-eyebrow">{flow?.title ?? "intent0"}</p>
              <button type="button" onClick={close} className="i0-link">
                Close
              </button>
            </div>

            {error && (
              <p role="alert" className="i0-alert">
                {error}
              </p>
            )}

            {phase.kind === "thinking" && <p className="i0-thinking">{phase.label}</p>}

            {phase.kind === "nomatch" && (
              <p className="i0-text">I couldn&apos;t match that to something this website can do. Try one of the options above.</p>
            )}

            {phase.kind === "step" && step && run && flow && (
              <form onSubmit={onStepSubmit} className="i0-form" key={`${run.flowId}:${step.id}`}>
                {isFinalIrreversible && (
                  <label className="i0-confirm">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                    I confirm these details are correct and want to submit. This can&apos;t be undone.
                  </label>
                )}
                <PageView
                  page={phase.page}
                  step={step}
                  values={run.values}
                  fieldErrors={fieldErrors}
                  kit={ui}
                  busy={busy}
                  stepIndex={run.stepIndex}
                  stepTitles={flow.steps.map((s) => s.title)}
                />
                {run.stepIndex > 0 && (
                  <button type="button" onClick={() => showStep(goBack(run))} className="i0-link">
                    ← Back
                  </button>
                )}
              </form>
            )}

            {phase.kind === "done" && run && flow && (
              <div className="i0-done">
                <p className="i0-ok">✓ {flow.title}: done</p>
                {(flow.steps.at(-1)?.action?.returns ?? []).map((k) => (
                  <p key={k} className="i0-text">
                    {k.replaceAll("_", " ")}: <b className="i0-mono">{String(run.outputs[k])}</b>
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
                I couldn&apos;t build this page ({phase.reason}). Taking you to the regular page…{" "}
                <a href={phase.url}>Go now</a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
