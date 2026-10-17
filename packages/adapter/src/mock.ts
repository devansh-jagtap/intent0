import type { Field, Flow, Manifest, PageNode, PageSpec } from "@intent0/schema";

const WORD = /[a-z0-9]+/g;
const STOP = new Set(["i", "a", "an", "the", "my", "to", "want", "need", "of", "for", "and", "it", "is", "please", "me"]);

function words(text: string): Set<string> {
  return new Set((text.toLowerCase().match(WORD) ?? []).filter((w) => !STOP.has(w)));
}

/** No-model intent matching: word overlap with each flow's title, description and examples. */
export function mockResolve(manifest: Manifest, text: string): { flowId: string | null; confidence: number } {
  const said = words(text);
  let best: { flowId: string | null; confidence: number } = { flowId: null, confidence: 0 };
  for (const flow of manifest.flows) {
    if (!flow.enabled) continue;
    const known = words([flow.title, flow.description, ...flow.examples].join(" "));
    let hits = 0;
    for (const w of said) if (known.has(w)) hits++;
    const confidence = said.size === 0 ? 0 : hits / said.size;
    if (confidence > best.confidence) best = { flowId: flow.id, confidence };
  }
  return best.confidence >= 0.25 ? best : { flowId: null, confidence: best.confidence };
}

const COMPONENT_FOR: Record<Field["type"], string> = {
  text: "TextField",
  email: "TextField",
  phone: "TextField",
  number: "TextField",
  textarea: "TextArea",
  select: "SelectField",
  radio: "SelectField",
  date: "DateField",
  file: "FileField",
  otp: "OtpField",
  checkbox: "Checkbox",
};

const SUBMIT_LABEL = { form: "Continue", verify: "Verify", review: "Submit", info: "Continue" } as const;

/** No-model page: a plain, always-valid layout built straight from the manifest step. */
export function templatePage(flow: Flow, stepIndex: number, lang: string): PageSpec {
  const step = flow.steps[stepIndex]!;
  const fields: PageNode[] = step.fields.map((f) => ({
    component: COMPONENT_FOR[f.type],
    props: { label: f.label, ...(f.help ? { help: f.help } : {}) },
    bind: f.name,
  }));
  const blocks: PageNode[] = [
    { component: "Stepper", props: { steps: flow.steps.map((s) => s.title), current: stepIndex } },
    { component: "Heading", props: { text: step.title, level: 2 } },
  ];
  if (fields.length > 0) blocks.push({ component: "Group", props: {}, children: fields });
  if (step.action) blocks.push({ component: "SubmitButton", props: { label: SUBMIT_LABEL[step.kind] } });
  return { flowId: flow.id, stepId: step.id, lang, title: step.title, blocks };
}
