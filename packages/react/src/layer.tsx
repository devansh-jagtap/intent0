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

async function postJson(url: string, body: unknown, signal?: AbortSignal) {
  const res = await fetch(url, { method: "POST", signal, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `request failed (${res.status})`);
  return data;
}

/** Calls the site's own backend endpoint for a step, exactly as the manifest says. */
async function callSiteAction(method: string, url: string, body: Record<string, unknown>) {
  let res: Response;
  if (method === "GET") {
    const u = new URL(url, window.location.origin);
    for (const [k, v] of Object.entries(body)) u.searchParams.set(k, String(v));
    res = await fetch(u, { credentials: "same-origin" });
  } else if (Object.values(body).some((v) => v instanceof File)) {
    const form = new FormData();
    for (const [k, v] of Object.entries(body)) form.set(k, v instanceof File ? v : String(v));
    res = await fetch(url, { method, body: form, credentials: "same-origin" });
  } else {
    res = await fetch(url, { method, body: JSON.stringify(body), headers: { "content-type": "application/json" }, credentials: "same-origin" });
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

  if (!config) return null;
  const { manifest, catalog } = config;

  function goToFallback(flowId: string, reason: string) {
    const url = fallbackUrl(manifest, flowId);
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
      { timeoutMs: 20_000, fallbackUrl: fallbackUrl(manifest, next.flowId), check: (p) => validatePage(p, manifest, catalog) },
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
      setError(typeof res.data.error === "string" ? res.data.error : "The website rejected this step.");
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
    <div className="i0-layer border-b-2 border-amber-400 bg-amber-50">
      <div className="max-w-6xl mx-auto px-4 py-3 grid gap-2">
        <form onSubmit={onIntent} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What do you want to do? e.g. “I started a bakery, I need to register it”"
            aria-label="What do you want to do?"
            className="flex-1 h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          />
          <ui.Button type="submit" disabled={phase.kind === "thinking"}>
            Go
          </ui.Button>
        </form>
        <div className="flex flex-wrap gap-2 text-xs items-center">
          <span className="text-slate-500">Or choose:</span>
          {manifest.flows.map((f) => (
            <button key={f.id} type="button" onClick={() => begin(f.id)} className="rounded-full bg-white border border-slate-300 px-3 py-1 hover:bg-slate-100">
              {f.title}
            </button>
          ))}
          <span className="ml-auto text-slate-400">intent0 · {config.mode === "model" ? "live model" : "mock model"}</span>
        </div>
      </div>

      {phase.kind !== "idle" && (
        <div ref={panelRef} className="max-w-3xl mx-auto px-4 pb-6">
          <div className="bg-white border rounded-xl shadow-sm p-5 grid gap-4">
            <div className="flex justify-between items-start gap-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{flow?.title ?? "intent0"}</p>
              <button type="button" onClick={close} className="text-xs text-slate-500 hover:underline">
                Close
              </button>
            </div>

            {error && <p role="alert" className="text-sm rounded border border-red-300 bg-red-50 text-red-800 px-3 py-2">{error}</p>}

            {phase.kind === "thinking" && <p className="text-sm text-slate-600 animate-pulse">{phase.label}</p>}

            {phase.kind === "nomatch" && (
              <p className="text-sm">I couldn&apos;t match that to something this website can do. Try one of the options above.</p>
            )}

            {phase.kind === "step" && step && run && (
              <form onSubmit={onStepSubmit} className="grid gap-4" key={`${run.flowId}:${step.id}`}>
                {isFinalIrreversible && (
                  <label className="flex items-center gap-2 text-sm rounded border border-amber-300 bg-amber-50 px-3 py-2">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                    I confirm these details are correct and want to submit. This can&apos;t be undone.
                  </label>
                )}
                <PageView page={phase.page} step={step} values={run.values} fieldErrors={fieldErrors} kit={ui} busy={busy} stepIndex={run.stepIndex} />
                {run.stepIndex > 0 && (
                  <button type="button" onClick={() => showStep(goBack(run))} className="justify-self-start text-xs text-slate-500 hover:underline">
                    ← Back
                  </button>
                )}
              </form>
            )}

            {phase.kind === "done" && run && flow && (
              <div className="grid gap-3 text-sm">
                <p className="font-semibold text-green-800">✓ {flow.title}: done</p>
                {(flow.steps.at(-1)?.action?.returns ?? [])
                  .map((k) => [k, run.outputs[k]] as const)
                  .map(([k, v]) => (
                    <p key={k}>
                      {k.replaceAll("_", " ")}: <b className="font-mono">{String(v)}</b>
                    </p>
                  ))}
                {flow.alsoNeed?.approved && (
                  <div className="rounded border-l-4 border-amber-400 bg-amber-50 px-3 py-2">
                    <p className="font-semibold">You may also need</p>
                    <p>{flow.alsoNeed.text}</p>
                  </div>
                )}
              </div>
            )}

            {phase.kind === "fallback" && (
              <p className="text-sm">
                I couldn&apos;t build this page ({phase.reason}). Taking you to the regular page…{" "}
                <a href={phase.url} className="underline">
                  Go now
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
