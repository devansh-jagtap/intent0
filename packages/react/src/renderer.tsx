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
  /** All step titles of the flow, from the manifest. */
  stepTitles: string[];
}

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);

function FieldShell({
  field,
  label,
  help,
  errors,
  children,
}: {
  field: Field;
  label?: string;
  help?: string;
  errors?: string[];
  children: ReactNode;
}) {
  const hint = help ?? field.help;
  return (
    <div className="i0-field">
      <label htmlFor={`i0-${field.name}`} className="i0-label">
        {label ?? field.label}
        {field.required && <span className="i0-req"> *</span>}
      </label>
      {children}
      {hint && <p className="i0-help">{hint}</p>}
      {errors?.map((e) => (
        <p key={e} className="i0-error">
          {e}
        </p>
      ))}
    </div>
  );
}

const INPUT_TYPE: Partial<Record<Field["type"], string>> = { email: "email", phone: "tel", number: "number" };

function renderField(node: PageNode, field: Field, ctx: RenderContext): ReactNode {
  const { Input, Textarea } = ctx.kit;
  const id = `i0-${field.name}`;
  const initial = str(ctx.values[field.name]);
  const invalid = Boolean(ctx.fieldErrors[field.name]) || undefined;
  const common = { id, name: field.name, required: field.required, defaultValue: initial, "aria-invalid": invalid };
  const label = str(node.props.label);
  const help = str(node.props.help);

  let control: ReactNode;
  switch (node.component) {
    case "TextField":
      control = <Input {...common} type={INPUT_TYPE[field.type] ?? "text"} placeholder={str(node.props.placeholder)} />;
      break;
    case "TextArea":
      control = <Textarea {...common} rows={3} />;
      break;
    case "SelectField":
      control = (
        <select {...common} defaultValue={initial ?? ""} className="i0-select">
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
        <label className="i0-check">
          <input type="checkbox" name={field.name} value="true" required={field.required} /> {label ?? field.label}
        </label>
      );
    default:
      return null;
  }
  return (
    <FieldShell field={field} label={label} help={help} errors={ctx.fieldErrors[field.name]}>
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
        <h2 key={key} className="i0-h2">{str(p.text)}</h2>
      ) : (
        <h3 key={key} className="i0-h3">{str(p.text)}</h3>
      );
    case "Text":
      return <p key={key} className="i0-text">{str(p.text)}</p>;
    case "Notice":
      return <p key={key} className="i0-notice">{str(p.text)}</p>;
    case "Group":
      return (
        <fieldset key={key} className="i0-group">
          {str(p.label) && <legend className="i0-legend">{str(p.label)}</legend>}
          {node.children?.map((c, i) => renderNode(c, ctx, `${key}.${i}`))}
        </fieldset>
      );
    case "Stepper":
      // Titles and position come from the manifest and the flow runner, not the model.
      return (
        <ol key={key} className="i0-steps">
          {ctx.stepTitles.map((s, i) => (
            <li key={s} className="i0-step" data-state={i === ctx.stepIndex ? "current" : i < ctx.stepIndex ? "done" : "todo"}>
              {i < ctx.stepIndex ? "✓ " : ""}
              {s}
            </li>
          ))}
        </ol>
      );
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
  return <div className="i0-page">{page.blocks.map((b, i) => renderNode(b, ctx, String(i)))}</div>;
}
