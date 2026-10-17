import { describe, expect, it } from "vitest";
import { builtinCatalog, fallbackUrl, resolveAction, validatePage, withFallback } from "../src/index";
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
