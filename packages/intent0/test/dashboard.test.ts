import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import example from "../../../examples/enterprise-portal.manifest.json";
import { createDashboardHandler } from "../src/cli/dashboard";
import { detectProject } from "../src/cli/project";

const TOKEN = "test-token-1234567890";

function setup() {
  const root = mkdtempSync(join(tmpdir(), "intent0-dash-"));
  writeFileSync(join(root, "intent0.manifest.json"), JSON.stringify(example));
  writeFileSync(join(root, ".env.local"), "LLM_BASE_URL=https://api.groq.com/openai/v1\nLLM_MODEL=openai/gpt-oss-120b\nLLM_API_KEY=secret-key-value\n");
  const handle = createDashboardHandler({ project: detectProject(root), token: TOKEN, version: "test" });
  const call = (path: string, body?: unknown, token = TOKEN) =>
    handle(new Request(`http://127.0.0.1:4200${path}`, { method: body === undefined ? "GET" : "POST", headers: { "x-intent0-token": token }, body: body === undefined ? undefined : JSON.stringify(body) }));
  const manifestOnDisk = () => JSON.parse(readFileSync(join(root, "intent0.manifest.json"), "utf8"));
  return { root, call, manifestOnDisk };
}

describe("intent0 dashboard", () => {
  it("refuses API calls without the token", async () => {
    const { call } = setup();
    expect((await call("/api/state", undefined, "wrong-token-123456789")).status).toBe(401);
  });

  it("shows state without ever sending the model key", async () => {
    const { call } = setup();
    const res = await call("/api/state");
    const text = await res.text();
    expect(text).not.toContain("secret-key-value");
    const state = JSON.parse(text);
    expect(state.model).toEqual({ baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b", keySet: true });
    expect(state.agents.tools.map((t: { name: string }) => t.name)).toEqual(["new_registration"]);
  });

  it("saves edits as a new approved revision", async () => {
    const { call, manifestOnDisk } = setup();
    const edited = structuredClone(example);
    edited.flows[0]!.title = "Register your business";
    edited.status = "draft";
    const res = await call("/api/manifest", { manifest: edited, baseRevision: example.revision });
    expect(res.status).toBe(200);
    const saved = manifestOnDisk();
    expect(saved).toMatchObject({ status: "approved", revision: example.revision + 1 });
    expect(saved.flows[0].title).toBe("Register your business");
  });

  it("rejects invalid tasks and stale edits without writing", async () => {
    const { call, manifestOnDisk } = setup();
    const broken = structuredClone(example);
    broken.flows[0]!.fallbackPath = "https://elsewhere.example";
    const bad = await call("/api/manifest", { manifest: broken, baseRevision: example.revision });
    expect(bad.status).toBe(422);
    expect((await bad.json()).issues.join(" ")).toContain("fallbackPath");

    const stale = await call("/api/manifest", { manifest: example, baseRevision: example.revision - 1 });
    expect(stale.status).toBe(409);
    expect(manifestOnDisk()).toEqual(example);
  });

  it("changes the model and keeps the old key when none is given", async () => {
    const { call, root } = setup();
    expect((await call("/api/model", { baseUrl: "http://localhost:11434/v1", model: "llama3.2" })).status).toBe(200);
    const env = readFileSync(join(root, ".env.local"), "utf8");
    expect(env).toContain("LLM_MODEL=llama3.2");
    expect(env).toContain("LLM_API_KEY=secret-key-value");
  });

  it("tries a request against the saved tasks", async () => {
    const { call, root } = setup();
    writeFileSync(join(root, ".env.local"), ""); // no model: keyword matching
    const res = await call("/api/try", { text: "I opened a bakery and want to register my business" });
    expect(await res.json()).toMatchObject({ kind: "task", flowId: "new_registration", approved: true });
  });
});
