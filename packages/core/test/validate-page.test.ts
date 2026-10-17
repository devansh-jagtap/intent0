import { describe, expect, it } from "vitest";
import { builtinCatalog, validatePage } from "../src/index.js";
import { manifest, validIdentityPage } from "./fixtures.js";

const page = () => structuredClone(validIdentityPage);
const errorsOf = (input: unknown) => {
  const r = validatePage(input, manifest, builtinCatalog);
  return r.ok ? [] : r.errors;
};

describe("validatePage", () => {
  it("accepts a page built from the catalog for an approved step", () => {
    expect(errorsOf(page())).toEqual([]);
  });

  it("rejects a component that isn't in the catalog", () => {
    const p = page();
    p.blocks.push({ component: "ScriptRunner", props: { code: "alert(1)" } } as never);
    expect(errorsOf(p).join("\n")).toMatch(/not in the catalog/);
  });

  it("rejects a disabled flow", () => {
    const p = { ...page(), flowId: "cancel_registration", stepId: "confirm_cancel" };
    expect(errorsOf(p).join("\n")).toMatch(/disabled/);
  });

  it("rejects an unknown flow", () => {
    expect(errorsOf({ ...page(), flowId: "transfer_money" }).join("\n")).toMatch(/unknown flow/);
  });

  it("rejects props the component doesn't have, or of the wrong type", () => {
    const p = page();
    p.blocks[1] = { component: "Heading", props: { text: "Hi", level: "two", href: "https://x" } } as never;
    const errors = errorsOf(p).join("\n");
    expect(errors).toMatch(/prop "level" must be number/);
    expect(errors).toMatch(/has no prop "href"/);
  });

  it("rejects a page that leaves out a required field", () => {
    const p = page();
    p.blocks[2]!.children!.pop();
    expect(errorsOf(p).join("\n")).toMatch(/required field "name_on_aadhaar"/);
  });

  it("rejects binding a field to the wrong kind of component", () => {
    const p = page();
    p.blocks[2]!.children![0] = { component: "FileField", props: { label: "Aadhaar" }, bind: "aadhaar_number" };
    expect(errorsOf(p).join("\n")).toMatch(/can't collect a text field/);
  });

  it("rejects binding a field from another step", () => {
    const p = page();
    p.blocks[2]!.children![0] = { component: "TextField", props: { label: "PAN" }, bind: "pan" };
    expect(errorsOf(p).join("\n")).toMatch(/not a field of step "identity"/);
  });

  it("requires exactly one submit button when the step calls the backend", () => {
    const p = page();
    p.blocks.pop();
    expect(errorsOf(p).join("\n")).toMatch(/exactly one submit button/);
  });

  it("rejects children inside a component that can't contain them", () => {
    const p = page();
    p.blocks[1] = { component: "Heading", props: { text: "Hi" }, children: [{ component: "Text", props: { text: "x" } }] } as never;
    expect(errorsOf(p).join("\n")).toMatch(/can't contain other components/);
  });

  it("rejects pages that are too large", () => {
    const p = page();
    const extra = Array.from({ length: 10 }, () => ({ component: "Text", props: { text: "x" } }));
    p.blocks.push(...(extra as never[]));
    const r = validatePage(p, manifest, builtinCatalog, { maxNodes: 8, maxDepth: 8 });
    expect(r.ok).toBe(false);
  });
});
