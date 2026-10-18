import { pathParams, type Flow, type Manifest, type Step } from "@intent0/schema";

export function findFlow(manifest: Manifest, flowId: string): Flow | undefined {
  return manifest.flows.find((f) => f.id === flowId);
}

export function findStep(flow: Flow, stepId: string): Step | undefined {
  return flow.steps.find((s) => s.id === stepId);
}

/**
 * The only way to turn "submit step X" into a real endpoint. Pages never contain URLs;
 * this looks the endpoint up in the approved manifest and refuses anything else.
 */
export function resolveAction(
  manifest: Manifest,
  flowId: string,
  stepId: string,
): { method: string; url: string; sends: string[] } | null {
  const flow = findFlow(manifest, flowId);
  if (!flow || !flow.enabled) return null;
  const step = findStep(flow, stepId);
  if (!step?.action) return null;

  const base = new URL(manifest.site.baseUrl);
  const url = new URL(step.action.path, base);
  // Belt and braces: the schema already forbids other hosts, but never trust input twice-removed.
  if (url.origin !== base.origin) return null;

  return { method: step.action.method, url: url.toString(), sends: step.action.sends };
}

/**
 * Builds the actual request for a step from what the user entered and earlier outputs:
 * {key} placeholders in the path are filled (URL-encoded) and left out of the body;
 * everything else in `sends` becomes the body (or query string for GET).
 * Returns null if the step isn't approved, or an error if a path value is missing.
 */
export function buildRequest(
  manifest: Manifest,
  flowId: string,
  stepId: string,
  available: Record<string, unknown>,
): { method: string; path: string; body: Record<string, unknown> } | { error: string } | null {
  const action = resolveAction(manifest, flowId, stepId);
  const step = action ? findStep(findFlow(manifest, flowId)!, stepId) : undefined;
  if (!action || !step?.action) return null;

  const params = pathParams(step.action.path);
  for (const p of params) {
    const v = available[p];
    if (v === undefined || v === null || String(v).trim() === "") return { error: `missing value for ${p}` };
  }
  const path = step.action.path.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, k: string) => encodeURIComponent(String(available[k]).trim()));
  const body = Object.fromEntries(
    action.sends.filter((k) => !params.includes(k) && available[k] !== undefined).map((k) => [k, available[k]]),
  );
  return { method: action.method, path, body };
}

/** The original page for a flow, used whenever the generated experience can't be shown. */
export function fallbackUrl(manifest: Manifest, flowId: string): string {
  const flow = findFlow(manifest, flowId);
  return new URL(flow?.fallbackPath ?? "/", manifest.site.baseUrl).toString();
}
