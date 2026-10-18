import { describe, expect, it } from "vitest";
import { Manifest } from "@intent0/schema";
import { buildRequest, builtinCatalog, fallbackUrl, resolveAction, validatePage, withFallback } from "../src/index";
import { manifest, validIdentityPage } from "./fixtures";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const original = fallbackUrl(manifest, "new_registration");

describe("withFallback", () => {
  it("returns the result when the task is quick and valid", async () => {
    const out = await withFallback(async () => validIdentityPage, {
      timeoutMs: 200,
      fallbackUrl: original,
      check: (p) => validatePage(p, manifest, builtinCatalog),
    });
    expect(out.kind).toBe("ok");
  });

  it("falls back to the original page on timeout", async () => {
    const out = await withFallback(async () => (await wait(200), validIdentityPage), {
      timeoutMs: 20,
      fallbackUrl: original,
    });
    expect(out).toMatchObject({ kind: "fallback", reason: "timeout", url: "http://localhost:3000/register/new" });
  });

  it("falls back when the task throws", async () => {
    const out = await withFallback(async () => Promise.reject(new Error("rate limited")), {
      timeoutMs: 200,
      fallbackUrl: original,
    });
    expect(out).toMatchObject({ kind: "fallback", reason: "error", detail: ["rate limited"] });
  });

  it("falls back when the generated page fails validation", async () => {
    const out = await withFallback(async () => ({ ...validIdentityPage, flowId: "cancel_registration" }), {
      timeoutMs: 200,
      fallbackUrl: original,
      check: (p) => validatePage(p, manifest, builtinCatalog),
    });
    expect(out).toMatchObject({ kind: "fallback", reason: "invalid" });
  });
});

describe("buildRequest (path values)", () => {
  const withPathParam = Manifest.parse({
    ...structuredClone(manifest),
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
            fields: [
              { name: "referenceId", label: "Reference", type: "text" },
              { name: "lang", label: "Language", type: "text", required: false },
            ],
            action: { method: "GET", path: "/api/status/{referenceId}", sends: ["referenceId", "lang"], returns: ["status"] },
          },
        ],
      },
    ],
  });

  it("fills {placeholders} into the path, URL-encoded, and keeps them out of the body", () => {
    expect(buildRequest(withPathParam, "track_status", "lookup", { referenceId: "DLA 2026/1", lang: "hi" })).toEqual({
      method: "GET",
      path: "/api/status/DLA%202026%2F1",
      body: { lang: "hi" },
    });
  });

  it("refuses to call the endpoint when a path value is missing", () => {
    expect(buildRequest(withPathParam, "track_status", "lookup", {})).toEqual({ error: "missing value for referenceId" });
  });
});

describe("resolveAction (binding)", () => {
  it("looks the endpoint up in the manifest", () => {
    expect(resolveAction(manifest, "new_registration", "identity")).toEqual({
      method: "POST",
      url: "http://localhost:3000/api/registration/otp/send",
      sends: ["aadhaar_number", "name_on_aadhaar"],
    });
  });

  it("returns nothing for a disabled flow", () => {
    expect(resolveAction(manifest, "cancel_registration", "confirm_cancel")).toBeNull();
  });

  it("returns nothing for an unknown step", () => {
    expect(resolveAction(manifest, "new_registration", "pay_fee")).toBeNull();
  });
});
