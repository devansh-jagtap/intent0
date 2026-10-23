import { useState, type ReactNode } from "react";
import type { ContentPage, Field, PageNode, PageSpec, Step } from "@intent0/schema";
import type { ResolvedKit } from "./kit";

// ---------------------------------------------------------------- forms

interface FormContext {
  step: Step;
  values: Record<string, unknown>;
  fieldErrors: Record<string, string[] | undefined>;
  kit: ResolvedKit;
  busy: boolean;
  /** Long forms are shown in parts; only fields of the current part are visible. */
  part: number;
  partOf: (field: string) => number;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);
const INPUT_TYPE: Partial<Record<Field["type"], string>> = { email: "email", phone: "tel", number: "number" };

/** Fields per part when a step has many of them (e.g. a 16-field passport form becomes 3 parts). */
export const FIELDS_PER_PART = 6;

/** Field names in the order the page shows them. */
export function boundFields(blocks: PageNode[]): string[] {
  const out: string[] = [];
  const walk = (nodes: PageNode[]) => {
    for (const n of nodes) {
      if (n.bind) out.push(n.bind);
      if (n.children) walk(n.children);
    }
  };
  walk(blocks);
  return out;
}

function FieldShell({ field, label, help, errors, hidden, children }: { field: Field; label?: string; help?: string; errors?: string[]; hidden: boolean; children: ReactNode }) {
  const hint = help ?? field.help;
  return (
    <div className="i0-field" hidden={hidden} data-part-field={field.name}>
      <label htmlFor={`i0-${field.name}`} className="i0-label">
        {label ?? field.label}
        {field.required && <span className="i0-req" aria-hidden> *</span>}
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

function renderField(node: PageNode, field: Field, ctx: FormContext): ReactNode {
  const { Input, Textarea } = ctx.kit;
  const id = `i0-${field.name}`;
  const initial = str(ctx.values[field.name]);
  const invalid = Boolean(ctx.fieldErrors[field.name]) || undefined;
  const common = { id, name: field.name, required: field.required, defaultValue: initial, "aria-invalid": invalid };
  const label = str(node.props.label);
  const help = str(node.props.help);
  const hidden = ctx.partOf(field.name) !== ctx.part;

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
            Choose…
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
        <label className="i0-check" hidden={hidden} data-part-field={field.name}>
          <input type="checkbox" name={field.name} value="true" required={field.required} /> {label ?? field.label}
        </label>
      );
    default:
      return null;
  }
  return (
    <FieldShell field={field} label={label} help={help} errors={ctx.fieldErrors[field.name]} hidden={hidden}>
      {control}
    </FieldShell>
  );
}

function renderFormNode(node: PageNode, ctx: FormContext, key: string): ReactNode {
  if (node.bind) {
    const field = ctx.step.fields.find((f) => f.name === node.bind);
    return field ? <div key={key}>{renderField(node, field, ctx)}</div> : null;
  }
  const p = node.props;
  // Explanatory text belongs with the first part of a long form.
  const intro = ctx.part === 0;
  switch (node.component) {
    case "Heading":
      return intro ? <h2 key={key} className="i0-h2">{str(p.text)}</h2> : null;
    case "Text":
      return intro ? <p key={key} className="i0-text">{str(p.text)}</p> : null;
    case "Notice":
      return <p key={key} className="i0-callout">{str(p.text)}</p>;
    case "Group": {
      const children = node.children?.map((c, i) => renderFormNode(c, ctx, `${key}.${i}`));
      const anyVisible = node.children?.some((c) => !c.bind || ctx.partOf(c.bind) === ctx.part) ?? true;
      return (
        <fieldset key={key} className="i0-group" hidden={!anyVisible}>
          {str(p.label) && <legend className="i0-legend">{str(p.label)}</legend>}
          {children}
        </fieldset>
      );
    }
    // The step trail lives in the sheet's rail; submit buttons are drawn by the form footer.
    case "Stepper":
    case "SubmitButton":
      return null;
    default:
      return null;
  }
}

export function submitLabel(page: PageSpec): string {
  const find = (nodes: PageNode[]): string | undefined => {
    for (const n of nodes) {
      if (n.component === "SubmitButton") return str(n.props.label);
      const inner = n.children && find(n.children);
      if (inner) return inner;
    }
  };
  return find(page.blocks) ?? "Continue";
}

/** Draws a validated form page. Only catalog components exist here; unknown ones render nothing. */
export function FormView({ page, ...ctx }: { page: PageSpec } & FormContext) {
  return <div className="i0-page">{page.blocks.map((b, i) => renderFormNode(b, ctx, String(i)))}</div>;
}

// ---------------------------------------------------------------- information pages

export interface Sources {
  sections: Record<string, { url: string; page: string; heading: string; anchor?: string }>;
  code: Record<string, { lang: string; code: string }>;
}

/** Citation numbers in the order sections are first cited. */
export function citationOrder(page: ContentPage): string[] {
  const order: string[] = [];
  const walk = (nodes: PageNode[]) => {
    for (const n of nodes) {
      const cites = (n.props as { cites?: unknown }).cites;
      if (Array.isArray(cites)) for (const c of cites) if (typeof c === "string" && !order.includes(c)) order.push(c);
      if (n.children) walk(n.children);
    }
  };
  walk(page.blocks);
  return order;
}

export const sourceHref = (s: { url: string; anchor?: string }) => `${s.url}${s.anchor ? `#${s.anchor}` : ""}`;
const items = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : []);

function Cites({ ids, order, sources }: { ids: unknown; order: string[]; sources: Sources }) {
  return (
    <>
      {items(ids).map((id) => {
        const s = sources.sections[id];
        const n = order.indexOf(id) + 1;
        return s && n > 0 ? (
          <a key={id} className="i0-cite" href={sourceHref(s)} title={`${s.page}: ${s.heading}`}>
            {n}
          </a>
        ) : null;
      })}
    </>
  );
}

function CodeView({ code, caption }: { code: { lang: string; code: string }; caption?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <figure className="i0-code">
      <div className="i0-code-head">
        <span>{caption ?? code.lang}</span>
        <button
          type="button"
          className="i0-copy"
          data-done={copied ? "" : undefined}
          onClick={() => {
            void navigator.clipboard?.writeText(code.code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            });
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{code.code}</code>
      </pre>
    </figure>
  );
}

const Tick = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface ContentContext {
  sources: Sources;
  order: string[];
  kit: ResolvedKit;
  taskTitle: (flowId: string) => string | undefined;
  onStartTask: (flowId: string) => void;
}

/** A guided walk-through: one step at a time, with progress, and steps ticked off as you go. */
function StepsView({ node, ctx, id }: { node: PageNode; ctx: ContentContext; id: string }) {
  const steps = node.children ?? [];
  const [at, setAt] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const finished = done.size === steps.length;
  const step = steps[at];
  const { Button } = ctx.kit;
  const next = () => {
    setDone((d) => new Set(d).add(at));
    if (at < steps.length - 1) setAt(at + 1);
  };
  return (
    <div className="i0-guide">
      <div className="i0-progress" aria-hidden>
        <span style={{ width: `${(done.size / Math.max(1, steps.length)) * 100}%` }} />
      </div>
      <div className="i0-guide-body">
        <ol className="i0-guide-nav" aria-label="Steps">
          {steps.map((s, i) => (
            <li key={i}>
              <button type="button" onClick={() => setAt(i)} aria-current={i === at ? "step" : undefined} data-done={done.has(i) ? "" : undefined}>
                <span className="i0-guide-n">{done.has(i) ? <Tick /> : i + 1}</span>
                <span>{str(s.props.title)}</span>
              </button>
            </li>
          ))}
        </ol>
        {step && (
          <div className="i0-guide-step" key={at} role="group" aria-labelledby={`${id}-t${at}`}>
            <p className="i0-guide-count">
              Step {at + 1} of {steps.length}
            </p>
            <h3 className="i0-h3" id={`${id}-t${at}`}>
              {str(step.props.title)}
            </h3>
            {step.children?.map((c, i) => renderContentNode(c, ctx, `${id}.${at}.${i}`))}
            <div className="i0-guide-actions">
              <Button type="button" onClick={next} data-i0-primary="">
                {at < steps.length - 1 ? "Done, next step" : finished ? "All done" : "Done"}
              </Button>
              {at > 0 && (
                <button type="button" className="i0-quiet" onClick={() => setAt(at - 1)}>
                  Back
                </button>
              )}
              {finished && (
                <span className="i0-finished" role="status">
                  <Tick /> All {steps.length} steps done
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Alternatives the docs cover (apps, platforms): pick one, see only that. */
function ChoiceView({ node, ctx, id }: { node: PageNode; ctx: ContentContext; id: string }) {
  const options = node.children ?? [];
  const [pick, setPick] = useState(0);
  const option = options[pick];
  return (
    <div className="i0-choice">
      {str(node.props.label) && <p className="i0-choice-label">{str(node.props.label)}</p>}
      <div className="i0-tabs" role="tablist" aria-label={str(node.props.label) ?? "Options"}>
        {options.map((o, i) => (
          <button key={i} type="button" role="tab" id={`${id}-o${i}`} aria-selected={i === pick} aria-controls={`${id}-p`} onClick={() => setPick(i)}>
            {str(o.props.label)}
          </button>
        ))}
      </div>
      {option && (
        <div className="i0-choice-panel" id={`${id}-p`} role="tabpanel" aria-labelledby={`${id}-o${pick}`} key={pick}>
          {option.children?.map((c, i) => renderContentNode(c, ctx, `${id}.${pick}.${i}`))}
        </div>
      )}
    </div>
  );
}

function ChecklistView({ node, ctx }: { node: PageNode; ctx: ContentContext }) {
  const list = items(node.props.items);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  return (
    <div className="i0-checklist">
      <ul>
        {list.map((item, i) => (
          <li key={i}>
            <label data-on={checked.has(i) ? "" : undefined}>
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() =>
                  setChecked((c) => {
                    const n = new Set(c);
                    if (n.has(i)) n.delete(i);
                    else n.add(i);
                    return n;
                  })
                }
              />
              <span className="i0-box" aria-hidden>
                <Tick />
              </span>
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="i0-checklist-foot">
        {checked.size} of {list.length} checked
        <Cites ids={node.props.cites} order={ctx.order} sources={ctx.sources} />
      </p>
    </div>
  );
}

function renderContentNode(node: PageNode, ctx: ContentContext, key: string): ReactNode {
  const p = node.props;
  switch (node.component) {
    case "Section":
      return (
        <section key={key} className="i0-section">
          {str(p.heading) && <h2 className="i0-h2">{str(p.heading)}</h2>}
          {node.children?.map((c, i) => renderContentNode(c, ctx, `${key}.${i}`))}
        </section>
      );
    case "Heading":
      return (
        <h3 key={key} className="i0-h3">
          {str(p.text)}
        </h3>
      );
    case "Intro":
      return (
        <p key={key} className="i0-lead">
          {str(p.text)}
          <Cites ids={p.cites} order={ctx.order} sources={ctx.sources} />
        </p>
      );
    case "Facts":
      return (
        <ul key={key} className="i0-facts">
          {items(p.items).map((f, i) => (
            <li key={i}>
              <Tick /> {f}
            </li>
          ))}
          <li className="i0-facts-cite">
            <Cites ids={p.cites} order={ctx.order} sources={ctx.sources} />
          </li>
        </ul>
      );
    case "Paragraph":
      return (
        <p key={key} className="i0-text">
          {str(p.text)}
          <Cites ids={p.cites} order={ctx.order} sources={ctx.sources} />
        </p>
      );
    case "List":
      return (
        <div key={key} className="i0-text">
          <ul className="i0-list">
            {items(p.items).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <Cites ids={p.cites} order={ctx.order} sources={ctx.sources} />
        </div>
      );
    case "Callout":
      return (
        <p key={key} className="i0-callout i0-text" data-tone={str(p.tone) ?? "info"}>
          {str(p.text)}
          <Cites ids={p.cites} order={ctx.order} sources={ctx.sources} />
        </p>
      );
    case "Checklist":
      return <ChecklistView key={key} node={node} ctx={ctx} />;
    case "Steps":
      return <StepsView key={key} node={node} ctx={ctx} id={`i0s${key.replace(/\./g, "-")}`} />;
    case "Choice":
      return <ChoiceView key={key} node={node} ctx={ctx} id={`i0c${key.replace(/\./g, "-")}`} />;
    case "CodeBlock": {
      const code = ctx.sources.code[String(p.ref)];
      return code ? <CodeView key={key} code={code} caption={str(p.caption)} /> : null;
    }
    case "TaskCard": {
      const flowId = String(p.flowId);
      const title = ctx.taskTitle(flowId);
      if (!title) return null;
      const { Button } = ctx.kit;
      return (
        <div key={key} className="i0-task">
          <strong>{str(p.label) ?? title}</strong>
          <Button type="button" onClick={() => ctx.onStartTask(flowId)} data-i0-primary="">
            Start
          </Button>
        </div>
      );
    }
    default:
      return null;
  }
}

/**
 * Draws a validated page made for one request: its title, intro and facts as the top of the
 * page, then the walk-through. Parts arrive one after another. Code comes from the site's docs
 * (sources), never from the model.
 */
export function ContentView({ page, ...ctx }: { page: ContentPage } & ContentContext) {
  const top = page.blocks.filter((b) => b.component === "Intro" || b.component === "Facts");
  const rest = page.blocks.filter((b) => !top.includes(b));
  return (
    <article className="i0-page">
      <header className="i0-hero">
        <h1 className="i0-title i0-in" style={{ ["--i0-i" as string]: 0 }}>
          {page.title}
        </h1>
        {top.map((b, i) => (
          <div className="i0-in" key={i} style={{ ["--i0-i" as string]: i + 1 }}>
            {renderContentNode(b, ctx, `h${i}`)}
          </div>
        ))}
      </header>
      {rest.map((b, i) => (
        <div className="i0-in" key={i} style={{ ["--i0-i" as string]: top.length + i + 1 }}>
          {renderContentNode(b, ctx, String(i))}
        </div>
      ))}
    </article>
  );
}
