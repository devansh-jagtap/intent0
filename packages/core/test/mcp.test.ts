import { describe, expect, it } from "vitest";
import { createMcpServer, type SiteCall } from "../src/index";
import { manifest } from "./fixtures";

/** A fake website: records calls and answers each registration step. */
function fakeSite() {
  const calls: string[] = [];
  const call: SiteCall = async (method, path) => {
    calls.push(`${method} ${path}`);
    const data: Record<string, Record<string, unknown>> = {
      "/api/registration/otp/send": { otp_request_id: "otp-1" },
      "/api/registration/otp/verify": { applicant_token: "tok-1" },
      "/api/registration/details": { draft_id: "draft-1" },
      "/api/registration/submit": { reference_number: "DEMO-1" },
    };
    return { ok: true, status: 200, data: data[path] ?? {} };
  };
  return { calls, call };
}

const parse = (reply: unknown) => JSON.parse((reply as { result: { content: { text: string }[] } }).result.content[0]!.text);

describe("MCP server", () => {
  it("lists only public, enabled, approved tasks", async () => {
    const server = createMcpServer({ manifest, index: null, call: fakeSite().call, version: "test" });
    const reply = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const names = (reply as { result: { tools: { name: string }[] } }).result.tools.map((t) => t.name);
    expect(names).toEqual(["new_registration"]);
  });

  it("offers nothing from a draft manifest", () => {
    const server = createMcpServer({ manifest: { ...manifest, status: "draft" }, index: null, call: fakeSite().call, version: "test" });
    expect(server.tools).toEqual([]);
  });

  it("answers initialize and ignores notifications", async () => {
    const server = createMcpServer({ manifest, index: null, call: fakeSite().call, version: "test" });
    const init = await server.handle({ jsonrpc: "2.0", id: "a", method: "initialize", params: { protocolVersion: "2025-03-26" } });
    expect(init).toMatchObject({ id: "a", result: { protocolVersion: "2025-03-26", capabilities: { tools: {} } } });
    expect(await server.handle({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
    expect(await server.handle({ jsonrpc: "2.0", id: 2, method: "resources/list" })).toMatchObject({ error: { code: -32601 } });
    expect(await server.handle("nonsense")).toMatchObject({ error: { code: -32600 } });
  });

  it("asks for missing input, then for confirmation, before an irreversible submit", async () => {
    const site = fakeSite();
    const server = createMcpServer({ manifest, index: null, call: site.call, version: "test" });
    const callTool = (args: Record<string, unknown>) => server.handle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "new_registration", arguments: args } });

    const first = parse(await callTool({ aadhaar_number: "123412341234", name_on_aadhaar: "Asha" }));
    expect(first).toMatchObject({ status: "needs_input", missing: [{ name: "otp" }] });

    const values = { otp: "123456", business_type: "proprietorship", business_name: "Asha Bakes", activity_description: "Bakery", activity_code: "10711", pan: "ABCDE1234F", final_otp: "123456" };
    const second = parse(await callTool({ ...values, resume: first.resume }));
    expect(second.status).toBe("needs_confirmation");
    expect(site.calls).not.toContain("POST /api/registration/submit");

    const done = parse(await callTool({ ...values, resume: first.resume, confirmed: true }));
    expect(done).toEqual({ status: "done", task: "new_registration", result: { reference_number: "DEMO-1" } });
    expect(site.calls.at(-1)).toBe("POST /api/registration/submit");
  });

  it("refuses tasks it doesn't offer", async () => {
    const server = createMcpServer({ manifest, index: null, call: fakeSite().call, version: "test" });
    const reply = await server.handle({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "cancel_registration", arguments: {} } });
    expect(reply).toMatchObject({ result: { isError: true } });
  });
});
