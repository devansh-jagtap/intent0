import { describe, expect, it } from "vitest";
import { Manifest, ModelConfig, PageSpec, formatIssues } from "../src/index";
import example from "../../../examples/enterprise-portal.manifest.json";

const clone = <T>(value: T): T => structuredClone(value);

describe("example manifest", () => {
  it("is valid", () => {
    const result = Manifest.safeParse(example);
    expect(result.success ? [] : formatIssues(result.error)).toEqual([]);
  });
});

describe("manifest rules", () => {
  it("rejects duplicate flow ids", () => {
    const bad = clone(example);
    bad.flows.push(clone(bad.flows[0]!));
    expect(Manifest.safeParse(bad).success).toBe(false);
  });

  it("rejects a step that needs an output no earlier step returns", () => {
    const bad = clone(example);
    bad.flows[0]!.steps[1]!.needs = ["something_never_returned"];
    const result = Manifest.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) expect(formatIssues(result.error).join("\n")).toMatch(/no earlier step returns/);
  });

  it("rejects an action that points at another host", () => {
    const bad = clone(example);
    bad.flows[0]!.steps[0]!.action!.path = "//evil.example/steal";
    expect(Manifest.safeParse(bad).success).toBe(false);
  });

  it("rejects a select field without options", () => {
    const bad = clone(example);
    delete (bad.flows[0]!.steps[2]!.fields[0] as { options?: unknown }).options;
    expect(Manifest.safeParse(bad).success).toBe(false);
  });
});

describe("real API key names and path values", () => {
  const flow = (path: string, sends: string[]) => ({
    ...clone(example),
    flows: [
      {
        id: "track_status",
        title: "Track",
        description: "Track an application",
        auth: "public",
        fallbackPath: "/track",
        steps: [
          {
            id: "lookup",
            title: "Find it",
            kind: "form",
            fields: [{ name: "referenceId", label: "Reference", type: "text" }],
            action: { method: "GET", path, sends, returns: ["status", "referenceId"] },
          },
        ],
      },
    ],
  });

  it("keeps camelCase keys exactly as the API uses them", () => {
    const r = Manifest.safeParse(flow("/api/status/{referenceId}", ["referenceId"]));
    expect(r.success ? [] : formatIssues(r.error)).toEqual([]);
  });

  it("requires every {placeholder} in a path to be in sends", () => {
    const r = Manifest.safeParse(flow("/api/status/{referenceId}", []));
    expect(r.success).toBe(false);
    if (!r.success) expect(formatIssues(r.error).join("\n")).toMatch(/must also be listed in sends/);
  });
});

describe("model config", () => {
  it("has no place for an API key", () => {
    const result = ModelConfig.safeParse({ provider: "groq", model: "some-model", apiKey: "sk-123" });
    expect(result.success).toBe(false);
  });
});

describe("page spec", () => {
  it("rejects extra keys such as a URL", () => {
    const result = PageSpec.safeParse({
      flowId: "new_registration",
      stepId: "identity",
      lang: "en",
      title: "Verify identity",
      submitUrl: "https://evil.example",
      blocks: [{ component: "Text", props: { text: "hi" } }],
    });
    expect(result.success).toBe(false);
  });
});
