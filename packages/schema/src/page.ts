import { z } from "zod";
import { Id } from "./common.js";

/**
 * One node of a generated page: which catalog component to show, its props,
 * and which manifest field it collects (if any). Strict, so a model can't sneak in
 * extra keys such as a URL or an onClick handler.
 */
export const PageNode = z.strictObject({
  component: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
  bind: Id.optional(),
  get children(): z.ZodOptional<z.ZodArray<typeof PageNode>> {
    return z.array(PageNode).optional();
  },
});
export type PageNode = z.infer<typeof PageNode>;

/**
 * The JSON a model generates for one step. It says *which step* it submits, never
 * *where*: the core resolves the endpoint from the approved manifest.
 */
export const PageSpec = z.strictObject({
  flowId: Id,
  stepId: Id,
  lang: z.string().min(2).max(10),
  title: z.string().min(1).max(200),
  blocks: z.array(PageNode).min(1),
});
export type PageSpec = z.infer<typeof PageSpec>;
