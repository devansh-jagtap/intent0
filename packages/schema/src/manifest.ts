import { z } from "zod";
import { Id, SitePath } from "./common";
import { ModelConfig } from "./model";

export const FieldType = z.enum([
  "text",
  "email",
  "phone",
  "number",
  "date",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "file",
  "otp",
]);
export type FieldType = z.infer<typeof FieldType>;

export const Field = z
  .strictObject({
    name: Id,
    label: z.string().min(1),
    type: FieldType,
    required: z.boolean().default(true),
    help: z.string().optional(),
    /** Choices come from the manifest, never from the model, so it can't invent options. */
    options: z.array(z.strictObject({ value: z.string(), label: z.string() })).optional(),
    /** Regular expression the value must match, e.g. "^\\d{6}$" for an OTP. */
    pattern: z
      .string()
      .refine((p) => {
        try {
          new RegExp(p);
          return true;
        } catch {
          return false;
        }
      }, "not a valid regular expression")
      .optional(),
  })
  .refine((f) => !["select", "radio"].includes(f.type) || (f.options?.length ?? 0) > 0, {
    message: "select and radio fields need options",
    path: ["options"],
  });
export type Field = z.infer<typeof Field>;

/** The existing backend endpoint a step calls. The page never contains this; the core looks it up. */
export const Action = z.strictObject({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: SitePath,
  /** Field names (from this or earlier steps) and outputs (from earlier steps) sent to the endpoint. */
  sends: z.array(Id).default([]),
  /** Values the endpoint returns that later steps depend on, e.g. "otp_request_id". */
  returns: z.array(Id).default([]),
});
export type Action = z.infer<typeof Action>;

export const Step = z.strictObject({
  id: Id,
  title: z.string().min(1),
  kind: z.enum(["form", "verify", "review", "info"]),
  fields: z.array(Field).default([]),
  action: Action.optional(),
  /** Outputs from earlier steps this step cannot start without. */
  needs: z.array(Id).default([]),
});
export type Step = z.infer<typeof Step>;

export const Flow = z
  .strictObject({
    id: Id,
    title: z.string().min(1),
    description: z.string().min(1),
    /** Example phrases users might say; used to match intents. */
    examples: z.array(z.string().min(1)).default([]),
    enabled: z.boolean().default(true),
    /** Irreversible flows always require an explicit user confirmation before the final submit. */
    irreversible: z.boolean().default(false),
    auth: z.enum(["public", "signed_in"]),
    /** The original page for this task; users land here if generation fails. */
    fallbackPath: SitePath,
    steps: z.array(Step).min(1),
    /** "You may also need" note shown after completion. No links by design. */
    alsoNeed: z
      .strictObject({
        text: z.string().min(1),
        approved: z.boolean(),
      })
      .optional(),
  })
  .superRefine((flow, ctx) => {
    const stepIds = new Set<string>();
    const fieldNames = new Set<string>();
    const outputs = new Set<string>();

    flow.steps.forEach((step, i) => {
      const at = (...rest: (string | number)[]) => ["steps", i, ...rest];

      if (stepIds.has(step.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate step id "${step.id}"`, path: at("id") });
      }
      stepIds.add(step.id);

      for (const need of step.needs) {
        if (!outputs.has(need)) {
          ctx.addIssue({
            code: "custom",
            message: `needs "${need}", but no earlier step returns it`,
            path: at("needs"),
          });
        }
      }

      step.fields.forEach((field, j) => {
        if (fieldNames.has(field.name)) {
          ctx.addIssue({
            code: "custom",
            message: `field "${field.name}" is already used by an earlier step`,
            path: at("fields", j, "name"),
          });
        }
        fieldNames.add(field.name);
      });

      if (step.action) {
        for (const sent of step.action.sends) {
          if (!fieldNames.has(sent) && !outputs.has(sent)) {
            ctx.addIssue({
              code: "custom",
              message: `sends "${sent}", which is not a field or an earlier output`,
              path: at("action", "sends"),
            });
          }
        }
        for (const out of step.action.returns) outputs.add(out);
      }
    });
  });
export type Flow = z.infer<typeof Flow>;

export const Manifest = z
  .strictObject({
    schemaVersion: z.literal(1),
    site: z.strictObject({
      id: Id,
      name: z.string().min(1),
      baseUrl: z.url(),
    }),
    /** Increases with every change; the adapter uses it to notice updates. */
    revision: z.number().int().min(1),
    status: z.enum(["draft", "approved"]),
    model: ModelConfig,
    flows: z.array(Flow).min(1),
  })
  .superRefine((manifest, ctx) => {
    const seen = new Set<string>();
    manifest.flows.forEach((flow, i) => {
      if (seen.has(flow.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate flow id "${flow.id}"`, path: ["flows", i, "id"] });
      }
      seen.add(flow.id);
    });
  });
export type Manifest = z.infer<typeof Manifest>;
