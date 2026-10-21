import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { dashboardAction, dashboardState } from "../src/cli/dashboard";

const manifest = {
  schemaVersion: 1,
  site: { id: "test_site", name: "Test site", baseUrl: "http://localhost:3999" },
  revision: 1,
  status: "draft",
  model: { provider: "groq", model: "openai/gpt-oss-120b" },
  flows: [
    {
      id: "contact",
      title: "Contact support",
      description: "Send a message to support.",
      auth: "public",
      fallbackPath: "/contact",
      steps: [{ id: "message", title: "Your message", kind: "form", fields: [{ name: "message", label: "Message", type: "textarea" }], action: { method: "POST", path: "/api/contact", sends: ["message"] } }],
      alsoNeed: { text: "Check the help pages.", approved: false },
    },
  ],
};

let root: string;
const read = () => JSON.parse(readFileSync(join(root, "intent0.manifest.json"), "utf8"));

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "intent0-dash-"));
  writeFileSync(join(root, "intent0.manifest.json"), JSON.stringify(manifest));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "test-site" }));
});

describe("dashboard", () => {
  it("switches tasks and their 'you may also need' note, bumping the revision", async () => {
    await dashboardAction(root, "flow", { id: "contact", enabled: false, alsoNeedApproved: true });
    expect(read().flows[0]).toMatchObject({ enabled: false, alsoNeed: { approved: true } });
    expect(read().revision).toBe(2);
    await expect(dashboardAction(root, "flow", { id: "nope", enabled: true })).rejects.toThrow(/No task/);
  });

  it("approves a draft", async () => {
    await dashboardAction(root, "approve", {});
    expect(read()).toMatchObject({ status: "approved", revision: 2 });
  });

  it("saves the model key to .env.local only, and never shows it", async () => {
    await dashboardAction(root, "model", { provider: "nvidia", model: "", baseUrl: "", apiKey: "secret-test-key" });
    const env = readFileSync(join(root, ".env.local"), "utf8");
    expect(env).toContain("LLM_API_KEY=secret-test-key");
    expect(env).toContain("LLM_BASE_URL=https://integrate.api.nvidia.com/v1");
    expect(JSON.stringify(read())).not.toContain("secret-test-key");
    const state = dashboardState(root);
    expect(state.model).toMatchObject({ keySet: true, model: "openai/gpt-oss-120b" });
    expect(JSON.stringify(state)).not.toContain("secret-test-key");
  });
});
