import type { Flow, Manifest, Step } from "@intent0/schema";

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

/** The original page for a flow, used whenever the generated experience can't be shown. */
export function fallbackUrl(manifest: Manifest, flowId: string): string {
  const flow = findFlow(manifest, flowId);
  return new URL(flow?.fallbackPath ?? "/", manifest.site.baseUrl).toString();
}
