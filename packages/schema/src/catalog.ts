import * as z from "zod";
import { FieldType } from "./manifest";

export const PropType = z.enum(["string", "number", "boolean", "string[]"]);
export type PropType = z.infer<typeof PropType>;

/** A UI building block the model is allowed to use. */
export const CatalogComponent = z.strictObject({
  /** PascalCase, e.g. "TextField" or the company's own "ContactCard". */
  name: z.string().regex(/^[A-Z][A-Za-z0-9]*$/, "use PascalCase"),
  /** builtin = intent0's own (script tag); company = found in the company's code (SDK). */
  source: z.enum(["builtin", "company"]),
  /** Props the model may set, and their types. Anything else is rejected. */
  props: z.record(z.string(), PropType).default({}),
  /** Can contain other components. */
  container: z.boolean().default(false),
  /** Field types this component can collect input for. Empty = can't be bound to a field. */
  accepts: z.array(FieldType).default([]),
  /** Submits the current step. */
  submit: z.boolean().default(false),
});
export type CatalogComponent = z.infer<typeof CatalogComponent>;

export const ComponentCatalog = z
  .strictObject({ components: z.array(CatalogComponent).min(1) })
  .superRefine((catalog, ctx) => {
    const seen = new Set<string>();
    catalog.components.forEach((c, i) => {
      if (seen.has(c.name)) {
        ctx.addIssue({ code: "custom", message: `duplicate component "${c.name}"`, path: ["components", i, "name"] });
      }
      seen.add(c.name);
    });
  });
export type ComponentCatalog = z.infer<typeof ComponentCatalog>;
