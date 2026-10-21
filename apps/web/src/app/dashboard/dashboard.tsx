"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

// This page runs in the browser and talks to `npx intent0 dashboard` on the company's own computer.
// The link the command prints carries the address and a one-time token; nothing is stored on this website.

interface Flow {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  irreversible: boolean;
  auth: "public" | "signed_in";
  fallbackPath: string;
  steps: { id: string; title: string; action?: { method: string; path: string } }[];
  alsoNeed?: { text: string; approved: boolean };
}
interface State {
  manifest: { site: { name: string; baseUrl: string }; status: "draft" | "approved"; revision: number; flows: Flow[] } | null;
  issues: string[];
  model: { provider: string | null; model: string | null; baseUrl: string | null; keySet: boolean };
  presets: Record<string, { provider: string; baseUrl: string; model: string }>;
  memory: { pages: { url: string; title: string }[]; sections: number; builtAt: string; topics: string[] } | null;
}
interface Connection {
  api: string;
  token: string;
}

const SESSION_KEY = "intent0:dashboard";

function readConnection(): Connection | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const api = hash.get("api");
  const token = hash.get("t");
  if (api && token && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(api)) {
    const c = { api, token };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(c));
    } catch {
      /* storage blocked: the connection lasts until reload */
    }
    // Keep the token out of the address bar (and out of screenshots or shared links).
    history.replaceState(null, "", window.location.pathname);
    return c;
  }
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as Connection | null;
  } catch {
    return null;
  }
}

export function Dashboard() {
  const [conn, setConn] = useState<Connection | null | undefined>(undefined);
  const [state, setState] = useState<State>();
  const [error, setError] = useState<string>();
  const [modelNote, setModelNote] = useState<{ text: string; kind?: "good" | "bad" }>();
  const [memoryNote, setMemoryNote] = useState<{ text: string; kind?: "good" | "bad" }>();
  const [busy, setBusy] = useState<string>();
  const [provider, setProvider] = useState("custom");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  // A new link from the CLI may arrive in an already open tab (only the # part changes).
  useEffect(() => {
    const connect = () => {
      setState(undefined);
      setConn(readConnection());
    };
    connect();
    window.addEventListener("hashchange", connect);
    return () => window.removeEventListener("hashchange", connect);
  }, []);

  const api = useCallback(
    async (path: string, body?: unknown) => {
      if (!conn) throw new Error("Not connected.");
      const res = await fetch(`${conn.api}/api/${path}`, {
        method: body ? "POST" : "GET",
        headers: { "x-intent0-token": conn.token, "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
      return data;
    },
    [conn],
  );

  const load = useCallback(async () => {
    try {
      const s = (await api("state")) as unknown as State;
      setState(s);
      setError(undefined);
      const match = Object.entries(s.presets).find(([, p]) => p.baseUrl && p.baseUrl === s.model.baseUrl);
      setProvider(match ? match[0] : "custom");
      setModel(s.model.model ?? "");
      setBaseUrl(s.model.baseUrl ?? "");
    } catch {
      setError("Can't reach intent0 on your computer. Is `npx intent0 dashboard` still running? Start it again and open the new link it prints.");
    }
  }, [api]);

  useEffect(() => {
    if (conn) void load();
  }, [conn, load]);

  if (conn === undefined) return null;
  if (!conn) return <Connect />;
  if (error && !state)
    return (
      <div className="connect">
        <p className="note bad">{error}</p>
        <Connect />
      </div>
    );
  if (!state) return <p className="muted">Connecting to your computer…</p>;

  const m = state.manifest;

  async function act(name: string, body: unknown, after?: (r: Record<string, unknown>) => void) {
    setBusy(name);
    try {
      const r = await api(name, body);
      after?.(r);
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(undefined);
    await load();
  }

  async function saveModel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const apiKey = (form.elements.namedItem("apiKey") as HTMLInputElement).value;
    setModelNote({ text: "Saving…" });
    try {
      const r = await api("model", { provider, model, baseUrl, apiKey });
      (form.elements.namedItem("apiKey") as HTMLInputElement).value = "";
      setModelNote({ text: `Saved. ${typeof r.restart === "string" ? r.restart : ""}`, kind: "good" });
      await load();
    } catch (err) {
      setModelNote({ text: (err as Error).message, kind: "bad" });
    }
  }

  return (
    <>
      <div className="dash-head">
        <div>
          <h1 className="h2">{m ? m.site.name : "Your site"}</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {m ? `${m.site.baseUrl}, connected to your computer` : "Connected to your computer"}
          </p>
        </div>
        {state.issues.length ? (
          <span className="pill draft">Manifest has problems</span>
        ) : m?.status === "approved" ? (
          <span className="pill ok">Approved, revision {m.revision}</span>
        ) : (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="pill draft">Draft: visitors see nothing yet</span>
            <button className="btn" type="button" disabled={busy === "approve"} onClick={() => act("approve", {})}>
              Approve
            </button>
          </div>
        )}
      </div>

      <div className="dash-grid">
        <section className="panel">
          <h2>Tasks</h2>
          <p className="muted" style={{ margin: "0 0 12px", fontSize: 15 }}>
            Only tasks switched on are offered, to visitors and to AI agents. Changes apply straight away.
          </p>
          {state.issues.length > 0 && (
            <ul className="note bad">
              {state.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
          {m && m.flows.length === 0 && <p className="muted">No tasks: intent0 answers questions from your content only.</p>}
          {m?.flows.map((f) => (
            <div className="task" key={f.id} data-off={f.enabled ? undefined : ""}>
              <div className="task-row">
                <span className="task-title">{f.title}</span>
                <label className="switch">
                  {f.enabled ? "On" : "Off"}
                  <input
                    type="checkbox"
                    checked={f.enabled}
                    disabled={busy === `flow:${f.id}`}
                    onChange={(e) => act("flow", { id: f.id, enabled: e.target.checked })}
                    aria-label={`Offer ${f.title}`}
                  />
                </label>
              </div>
              <p className="task-desc">{f.description}</p>
              <div className="tags">
                <span className="tag">{f.auth === "signed_in" ? "needs sign-in" : "public"}</span>
                <span className="tag">
                  {f.steps.length} {f.steps.length === 1 ? "step" : "steps"}
                </span>
                {f.irreversible && <span className="tag warn">can&apos;t be undone: asks to confirm</span>}
              </div>
              <details>
                <summary>Steps and endpoints</summary>
                <ol>
                  {f.steps.map((s) => (
                    <li key={s.id}>
                      {s.title} {s.action ? <code>{`${s.action.method} ${s.action.path}`}</code> : "(no action)"}
                    </li>
                  ))}
                </ol>
                <p>
                  If anything fails, visitors go to <code>{f.fallbackPath}</code>
                </p>
              </details>
              {f.alsoNeed && (
                <label className="switch" style={{ alignItems: "flex-start" }}>
                  <input type="checkbox" checked={f.alsoNeed.approved} onChange={(e) => act("flow", { id: f.id, alsoNeedApproved: e.target.checked })} />
                  <span>Show after finishing: “{f.alsoNeed.text}”</span>
                </label>
              )}
            </div>
          ))}
        </section>

        <aside>
          <section className="panel">
            <h2>Model</h2>
            <p className="muted" style={{ margin: "0 0 14px", fontSize: 14 }}>
              {state.model.model ? `Using ${state.model.model}${state.model.baseUrl ? ` via ${state.model.baseUrl}` : ""}${state.model.keySet ? " (key saved)" : " (no key saved)"}` : "No model set."}
            </p>
            <form onSubmit={saveModel}>
              <label className="field">
                Provider
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    const p = state.presets[e.target.value];
                    if (p?.baseUrl) {
                      setBaseUrl(p.baseUrl);
                      setModel(p.model);
                    }
                  }}
                >
                  {Object.keys(state.presets).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Model
                <input value={model} onChange={(e) => setModel(e.target.value)} autoComplete="off" />
              </label>
              <label className="field">
                Base URL
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} autoComplete="off" />
              </label>
              <label className="field">
                New API key (leave empty to keep the current one)
                <input name="apiKey" type="password" autoComplete="off" />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn" type="submit">
                  Save model
                </button>
                <button
                  className="btn quiet"
                  type="button"
                  disabled={busy === "test-model"}
                  onClick={() => {
                    setModelNote({ text: "Asking the model…" });
                    setBusy("test-model");
                    api("test-model", {})
                      .then((r) => setModelNote({ text: `The model answered in ${(Number(r.ms) / 1000).toFixed(1)} s.`, kind: "good" }))
                      .catch((e: Error) => setModelNote({ text: e.message, kind: "bad" }))
                      .finally(() => setBusy(undefined));
                  }}
                >
                  Test connection
                </button>
              </div>
              <p className={`note ${modelNote?.kind ?? ""}`} role="status">
                {modelNote?.text}
              </p>
            </form>
          </section>

          <section className="panel">
            <h2>Site Memory</h2>
            <p className="muted" style={{ margin: "0 0 14px", fontSize: 14 }}>
              {state.memory
                ? `${state.memory.pages.length} pages, ${state.memory.sections} sections, built ${new Date(state.memory.builtAt).toLocaleString()}.`
                : "Not built yet."}
              {state.memory?.topics.length ? ` Topics: ${state.memory.topics.join(", ")}.` : ""}
            </p>
            <button
              className="btn"
              type="button"
              disabled={busy === "index"}
              onClick={() => {
                setMemoryNote({ text: "Reading your docs and pages… this can take a minute." });
                void act("index", {}, (r) =>
                  setMemoryNote({
                    text: `Done: ${String(r.pages)} pages, ${String(r.sections)} sections.${r.crawled ? "" : ` Your site wasn't running at ${String(r.site)}, so only files in the repo were read.`}`,
                    kind: "good",
                  }),
                );
              }}
            >
              Rebuild from the site
            </button>
            <p className={`note ${memoryNote?.kind ?? ""}`} role="status">
              {memoryNote?.text}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function Connect() {
  return (
    <div className="connect">
      <h1 className="h2">Connect your site</h1>
      <p className="muted">The dashboard works on your own computer, so your files and model key never leave it. To open it:</p>
      <ol>
        <li>Open a terminal in your website&apos;s folder.</li>
        <li>
          Run:
          <pre>
            <code>npx intent0 dashboard</code>
          </pre>
        </li>
        <li>Open the link it prints. It brings you back here, connected.</li>
      </ol>
      <p className="muted">
        New to intent0? Start with <a href="/docs/getting-started">Getting started</a>.
      </p>
    </div>
  );
}
