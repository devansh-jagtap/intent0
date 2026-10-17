import { describe, expect, it } from "vitest";
import { Manifest } from "@intent0/schema";
import example from "../../../examples/enterprise-portal.manifest.json";
import { createIntent0Handler, parseJsonReply, type JsonModel } from "../src/index";

const manifest = Manifest.parse(example);
const post = (body: unknown) => new Request("http://x/intent0", { method: "POST", body: JSON.stringify(body) });

/** A fake model that returns whatever we script. */
function scripted(...replies: unknown[]): JsonModel {
  return { name: "scripted", complete: async () => replies.shift() };
}

describe("adapter without a model (mock mode)", () => {
  const handle = createIntent0Handler({ manifest, model: null });

  it("config hides disabled flows and model settings", async () => {
    const body = await (await handle(new Request("http://x/intent0"), "config")).json();
    expect(body.manifest.flows.map((f: { id: string }) => f.id)).not.toContain("cancel_registration");
    expect(body.manifest.model.model).toBe("hidden");
  });

  it("matches a plain-language request to a flow", async () => {
    const body = await (await handle(post({ text: "I opened a bakery and want to register my business" }), "resolve")).json();
    expect(body.flowId).toBe("new_registration");
  });

  it("returns no flow for something the site can't do", async () => {
    const body = await (await handle(post({ text: "book a train ticket to Delhi" }), "resolve")).json();
    expect(body.flowId).toBeNull();
  });

  it("generates a valid template page for a step", async () => {
    const body = await (await handle(post({ flowId: "new_registration", stepId: "identity" }), "generate")).json();
    expect(body.page.stepId).toBe("identity");
  });

  it("refuses to generate pages for a disabled flow", async () => {
    const res = await handle(post({ flowId: "cancel_registration", stepId: "confirm_cancel" }), "generate");
    expect(res.status).toBe(404);
  });
});

describe("draft manifests", () => {
  const draft = Manifest.parse({ ...example, status: "draft" });
  const handle = createIntent0Handler({ manifest: draft, model: null });

  it("serve no flows until approved", async () => {
    const body = await (await handle(new Request("http://x/intent0"), "config")).json();
    expect(body.manifest.flows).toEqual([]);
  });

  it("refuse to generate pages", async () => {
    const res = await handle(post({ flowId: "new_registration", stepId: "identity" }), "generate");
    expect(res.status).toBe(404);
  });
});

describe("adapter with a model", () => {
  it("ignores a model that invents a flow", async () => {
    const handle = createIntent0Handler({ manifest, model: scripted({ flowId: "transfer_money", confidence: 0.99, prefill: {} }) });
    const body = await (await handle(post({ text: "send money" }), "resolve")).json();
    expect(body.flowId).toBeNull();
  });

  it("drops prefill for fields the flow doesn't have", async () => {
    const handle = createIntent0Handler({
      manifest,
      model: scripted({ flowId: "new_registration", confidence: 0.9, prefill: { business_name: "Bakery", admin: "true" } }),
    });
    const body = await (await handle(post({ text: "register my bakery" }), "resolve")).json();
    expect(body.prefill).toEqual({ business_name: "Bakery" });
  });

  it("drops a prefilled choice that isn't one of the field's options", async () => {
    const handle = createIntent0Handler({
      manifest,
      model: scripted({ flowId: "new_registration", confidence: 0.9, prefill: { business_type: "sole_trader", business_name: "Bakery" } }),
    });
    const body = await (await handle(post({ text: "register my bakery" }), "resolve")).json();
    expect(body.prefill).toEqual({ business_name: "Bakery" });
  });

  it("never shows an invalid model page: falls back to the template after a retry", async () => {
    const bad = { flowId: "new_registration", stepId: "identity", lang: "en", title: "x", blocks: [{ component: "Script", props: {} }] };
    const handle = createIntent0Handler({ manifest, model: scripted(bad, bad) });
    const body = await (await handle(post({ flowId: "new_registration", stepId: "identity" }), "generate")).json();
    expect(body.via).toBe("template");
    expect(JSON.stringify(body.page)).not.toContain("Script");
  });

  it("uses the template page when the model request fails", async () => {
    const failing: JsonModel = { name: "down", complete: async () => Promise.reject(new Error("model_not_found")) };
    const handle = createIntent0Handler({ manifest, model: failing });
    const body = await (await handle(post({ flowId: "new_registration", stepId: "identity" }), "generate")).json();
    expect(body).toMatchObject({ via: "template", warning: "model_not_found" });
  });
});

describe("parseJsonReply", () => {
  it("reads JSON wrapped in a code fence", () => {
    expect(parseJsonReply('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});
