import type { Field, PageNode, PageSpec, Step } from "@intent0/schema";
import type { ReactNode } from "react";
import type { ResolvedKit } from "./kit";

interface RenderContext {
  step: Step;
  values: Record<string, unknown>;
  fieldErrors: Record<string, string[] | undefined>;
  kit: ResolvedKit;
  busy: boolean;
  /** The real current step. The Stepper always shows this, not whatever the model wrote. */
  stepIndex: number;
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);

function FieldShell({ field, label, help, errors, children }: { field: Field; label?: string; help?: string; errors?: string[]; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={`i0-${field.name}`} className="text-sm font-medium">
        {label ?? field.label}
        {field.required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {(help ?? field.help) && <p className="text-xs text-slate-500">{help ?? field.help}</p>}
      {errors?.map((e) => (
        <p key={e} className="text-xs text-red-700">
          {e}
        </p>
      ))}
    </div>
  );
}

function renderField(node: PageNode, field: Field, ctx: RenderContext): ReactNode {
  const { Input, Textarea } = ctx.kit;
  const id = `i0-${field.name}`;
  const initial = str(ctx.values[field.name]);
  const common = { id, name: field.name, required: field.required, defaultValue: initial, "aria-invalid": Boolean(ctx.fieldErrors[field.name]) || undefined };
  const label = str(node.props.label);
  const help = str(node.props.help);

  let control: ReactNode;
  switch (node.component) {
    case "TextField":
      control = (
        <Input
          {...common}
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : "text"}
          placeholder={str(node.props.placeholder)}
        />
      );
      break;
    case "TextArea":
      control = <Textarea {...common} rows={3} />;
      break;
    case "SelectField":
      control = (
        <select {...common} defaultValue={initial ?? ""} className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm">
          <option value="" disabled>
            Select…
          </option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "DateField":
      control = <Input {...common} type="date" />;
      break;
    case "FileField":
      control = <Input id={id} name={field.name} type="file" required={field.required} />;
      break;
    case "OtpField":
      control = <Input {...common} inputMode="numeric" autoComplete="one-time-code" maxLength={num(node.props.length) ?? 6} />;
      break;
    case "Checkbox":
      return (
        <label key={field.name} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name={field.name} value="true" required={field.required} /> {label ?? field.label}
        </label>
      );
    default:
      return null;
  }
  return (
    <FieldShell key={field.name} field={field} label={label} help={help} errors={ctx.fieldErrors[field.name]}>
      {control}
    </FieldShell>
  );
}

function renderNode(node: PageNode, ctx: RenderContext, key: string): ReactNode {
  if (node.bind) {
    const field = ctx.step.fields.find((f) => f.name === node.bind);
    return field ? <div key={key}>{renderField(node, field, ctx)}</div> : null;
  }
  const p = node.props;
  switch (node.component) {
    case "Heading":
      return (num(p.level) ?? 2) <= 2 ? (
        <h2 key={key} className="text-lg font-semibold">{str(p.text)}</h2>
      ) : (
        <h3 key={key} className="font-semibold">{str(p.text)}</h3>
      );
    case "Text":
      return <p key={key} className="text-sm text-slate-700">{str(p.text)}</p>;
    case "Notice":
      return <p key={key} className="text-sm rounded border border-amber-300 bg-amber-50 px-3 py-2">{str(p.text)}</p>;
    case "Group":
      return (
        <fieldset key={key} className="grid gap-4">
          {str(p.label) && <legend className="text-sm font-semibold mb-2">{str(p.label)}</legend>}
          {node.children?.map((c, i) => renderNode(c, ctx, `${key}.${i}`))}
        </fieldset>
      );
    case "Stepper": {
      const steps = Array.isArray(p.steps) ? (p.steps as string[]) : [];
      const current = ctx.stepIndex;
      return (
        <ol key={key} className="flex flex-wrap gap-2 text-xs">
          {steps.map((s, i) => (
            <li
              key={s}
              className={`rounded-full px-2 py-1 ${i === current ? "bg-primary text-primary-foreground" : i < current ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}
            >
              {i < current ? "✓ " : ""}
              {s}
            </li>
          ))}
        </ol>
      );
    }
    case "SubmitButton": {
      const { Button } = ctx.kit;
      return (
        <div key={key}>
          <Button type="submit" disabled={ctx.busy}>
            {ctx.busy ? "Please wait…" : (str(p.label) ?? "Continue")}
          </Button>
        </div>
      );
    }
    default:
      return null;
  }
}

/** Draws a validated page spec. Only catalog components exist here; unknown ones render nothing. */
export function PageView({ page, ...ctx }: { page: PageSpec } & RenderContext) {
  return <div className="grid gap-4">{page.blocks.map((b, i) => renderNode(b, ctx, String(i)))}</div>;
}
