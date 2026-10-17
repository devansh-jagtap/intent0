import {
  PageSpec,
  formatIssues,
  type ComponentCatalog,
  type CatalogComponent,
  type Manifest,
  type PageNode,
  type PropType,
} from "@intent0/schema";
import { findFlow, findStep } from "./lookup";

export type ValidationResult = { ok: true; page: PageSpec } | { ok: false; errors: string[] };

export interface PageLimits {
  maxNodes: number;
  maxDepth: number;
}

const DEFAULT_LIMITS: PageLimits = { maxNodes: 200, maxDepth: 8 };

function matchesType(value: unknown, type: PropType): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "string[]":
      return Array.isArray(value) && value.every((v) => typeof v === "string");
  }
}

/**
 * Checks a model-generated page against the approved manifest and component catalog
 * before anything is shown. Every rule here is deterministic: if it fails, the caller
 * falls back to the original page.
 */
export function validatePage(
  input: unknown,
  manifest: Manifest,
  catalog: ComponentCatalog,
  limits: PageLimits = DEFAULT_LIMITS,
): ValidationResult {
  const parsed = PageSpec.safeParse(input);
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error) };
  const page = parsed.data;

  const flow = findFlow(manifest, page.flowId);
  if (!flow) return { ok: false, errors: [`unknown flow "${page.flowId}"`] };
  if (!flow.enabled) return { ok: false, errors: [`flow "${page.flowId}" is disabled`] };
  const step = findStep(flow, page.stepId);
  if (!step) return { ok: false, errors: [`unknown step "${page.stepId}" in flow "${flow.id}"`] };

  const components = new Map<string, CatalogComponent>(catalog.components.map((c) => [c.name, c]));
  const fields = new Map(step.fields.map((f) => [f.name, f]));
  const bound = new Set<string>();
  const errors: string[] = [];
  let nodeCount = 0;
  let submitCount = 0;

  const walk = (nodes: PageNode[], depth: number, path: string) => {
    if (depth > limits.maxDepth) {
      errors.push(`${path}: nested deeper than ${limits.maxDepth} levels`);
      return;
    }
    nodes.forEach((node, i) => {
      const here = `${path}[${i}]`;
      nodeCount++;

      const def = components.get(node.component);
      if (!def) {
        errors.push(`${here}: component "${node.component}" is not in the catalog`);
        return;
      }

      for (const [key, value] of Object.entries(node.props)) {
        const type = def.props[key];
        if (!type) errors.push(`${here}: ${def.name} has no prop "${key}"`);
        else if (!matchesType(value, type)) errors.push(`${here}: prop "${key}" must be ${type}`);
      }

      if (node.bind !== undefined) {
        const field = fields.get(node.bind);
        if (!field) errors.push(`${here}: "${node.bind}" is not a field of step "${step.id}"`);
        else if (!def.accepts.includes(field.type))
          errors.push(`${here}: ${def.name} can't collect a ${field.type} field ("${field.name}")`);
        else if (bound.has(field.name)) errors.push(`${here}: field "${field.name}" is shown twice`);
        else bound.add(field.name);
      }

      if (def.submit) submitCount++;

      if (node.children) {
        if (!def.container) errors.push(`${here}: ${def.name} can't contain other components`);
        else walk(node.children, depth + 1, `${here}.children`);
      }
    });
  };

  walk(page.blocks, 1, "blocks");

  if (nodeCount > limits.maxNodes) errors.push(`page has ${nodeCount} components; the limit is ${limits.maxNodes}`);

  for (const field of step.fields) {
    if (field.required && !bound.has(field.name)) errors.push(`required field "${field.name}" is missing from the page`);
  }

  if (step.action && submitCount !== 1) {
    errors.push(`step "${step.id}" needs exactly one submit button; found ${submitCount}`);
  }
  if (!step.action && submitCount > 0) {
    errors.push(`step "${step.id}" has no backend action, so it can't have a submit button`);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, page };
}
