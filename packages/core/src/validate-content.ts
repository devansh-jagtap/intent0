import { ContentPage, formatIssues, type PageNode } from "@intent0/schema";

/** Building blocks of an information page. Each allows only these props. */
export const contentCatalog: Record<string, { props: Record<string, "string" | "number" | "string[]">; container?: boolean }> = {
  Section: { props: { heading: "string" }, container: true },
  Heading: { props: { text: "string", level: "number" } },
  Paragraph: { props: { text: "string", cites: "string[]" } },
  List: { props: { items: "string[]", cites: "string[]" } },
  Callout: { props: { text: "string", tone: "string", cites: "string[]" } },
  CodeBlock: { props: { ref: "string", caption: "string" } },
  TaskCard: { props: { flowId: "string", label: "string" } },
};

/** Components whose text must be backed by Site Memory sections. */
const MUST_CITE = new Set(["Paragraph", "List", "Callout"]);

export interface ContentAllowed {
  /** Sections retrieved for this question; the only ones a page may cite. */
  sectionIds: Set<string>;
  /** Code blocks inside those sections; the only code a page may show. */
  codeIds: Set<string>;
  /** Approved tasks a page may offer to start. */
  flowIds: Set<string>;
}

export type ContentValidation = { ok: true; page: ContentPage } | { ok: false; errors: string[] };

/**
 * Checks a model-written information page: known components only, every paragraph cites
 * retrieved sections, code only by reference, task cards only for approved tasks.
 */
export function validateContentPage(input: unknown, allowed: ContentAllowed, maxNodes = 80): ContentValidation {
  const parsed = ContentPage.safeParse(input);
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error) };
  const errors: string[] = [];
  let count = 0;

  const walk = (nodes: PageNode[], path: string, depth: number) => {
    nodes.forEach((node, i) => {
      const at = `${path}[${i}]`;
      count++;
      const def = contentCatalog[node.component];
      if (!def) return void errors.push(`${at}: "${node.component}" is not a content component`);
      if (node.bind) errors.push(`${at}: content pages have no form fields`);
      for (const [k, v] of Object.entries(node.props)) {
        const type = def.props[k];
        if (!type) errors.push(`${at}: ${node.component} has no prop "${k}"`);
        else if (type === "string[]" ? !(Array.isArray(v) && v.every((x) => typeof x === "string")) : typeof v !== type)
          errors.push(`${at}: prop "${k}" must be ${type}`);
      }
      const p = node.props as Record<string, unknown>;
      if (MUST_CITE.has(node.component)) {
        const cites = Array.isArray(p.cites) ? (p.cites as string[]) : [];
        if (cites.length === 0) errors.push(`${at}: ${node.component} must cite at least one section`);
        for (const c of cites) if (!allowed.sectionIds.has(c)) errors.push(`${at}: cites unknown section "${c}"`);
        const text = typeof p.text === "string" ? p.text : Array.isArray(p.items) ? (p.items as string[]).join(" ") : "";
        if (text.length > 1_500) errors.push(`${at}: text too long; keep it short and cite the source`);
      }
      if (node.component === "CodeBlock" && !allowed.codeIds.has(String(p.ref))) errors.push(`${at}: code "${String(p.ref)}" doesn't exist in the site's docs`);
      if (node.component === "TaskCard" && !allowed.flowIds.has(String(p.flowId))) errors.push(`${at}: "${String(p.flowId)}" isn't an approved task`);
      if (node.children) {
        if (!def.container || depth > 2) errors.push(`${at}: ${node.component} can't contain other blocks`);
        else walk(node.children, `${at}.children`, depth + 1);
      }
    });
  };
  walk(parsed.data.blocks, "blocks", 1);
  if (count > maxNodes) errors.push(`page has ${count} blocks; the limit is ${maxNodes}`);
  return errors.length ? { ok: false, errors } : { ok: true, page: parsed.data };
}
