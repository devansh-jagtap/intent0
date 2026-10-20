import { afterEach, describe, expect, it, vi } from "vitest";
import { Manifest } from "@intent0/schema";
import example from "../../../examples/enterprise-portal.manifest.json";
import { ModelError, createIntent0Handler, openAiCompatible, parseJsonReply, type JsonModel } from "../src/index";

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

describe("model errors carry provider limits", () => {
  const replyWith = (status: number, body: string, headers: Record<string, string> = {}) =>
    vi.stubGlobal("fetch", async () => new Response(body, { status, headers }));
  const model = openAiCompatible({ baseUrl: "https://example.test/v1", apiKey: "k", model: "m" });

  afterEach(() => vi.unstubAllGlobals());

  it("reads the output-token cap from a 'request too large' reply", async () => {
    replyWith(429, '{"error":{"message":"Request too large for model on output tokens per minute (OTPM): Limit 1000, Requested 2048."}}');
    const err = (await model.complete("s", "u").catch((e: unknown) => e)) as ModelError;
    expect(err).toBeInstanceOf(ModelError);
    expect(err.outputLimit).toBe(1000);
  });

  it("reads how long to wait from a rate-limit reply", async () => {
    replyWith(429, '{"error":{"message":"Rate limit reached ... Please try again in 7.5s."}}');
    const err = (await model.complete("s", "u").catch((e: unknown) => e)) as ModelError;
    expect(err.retryAfterMs).toBe(7500);
  });
});

describe("parseJsonReply", () => {
  it("reads JSON wrapped in a code fence", () => {
    expect(parseJsonReply('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("ignores a reasoning model's <think> block, even with braces in it", () => {
    expect(parseJsonReply('<think>maybe {x} or {y}?</think>\n{"a":2}')).toEqual({ a: 2 });
  });
});

describe("MCP over HTTP (/intent0/mcp)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists public tasks and calls the website at siteUrl", async () => {
    const fetched: string[] = [];
    vi.stubGlobal("fetch", async (url: URL) => {
      fetched.push(String(url));
      return Response.json({ otp_request_id: "otp-1" });
    });
    const handle = createIntent0Handler({ manifest, model: null, siteUrl: "https://portal.example.gov" });
    const list = await (await handle(post({ jsonrpc: "2.0", id: 1, method: "tools/list" }), "mcp")).json();
    expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual(["new_registration"]);

    const call = await handle(post({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "new_registration", arguments: { aadhaar_number: "123412341234", name_on_aadhaar: "Asha" } } }), "mcp");
    expect(JSON.parse((await call.json()).result.content[0].text).status).toBe("needs_input");
    expect(fetched).toEqual(["https://portal.example.gov/api/registration/otp/send"]);
  });

  it("accepts notifications with 202 and rejects GET and bad JSON", async () => {
    const handle = createIntent0Handler({ manifest, model: null });
    expect((await handle(post({ jsonrpc: "2.0", method: "notifications/initialized" }), "mcp")).status).toBe(202);
    expect((await handle(new Request("http://x/intent0/mcp"), "mcp")).status).toBe(405);
    expect((await handle(new Request("http://x/intent0/mcp", { method: "POST", body: "{" }), "mcp")).status).toBe(400);
  });
});
