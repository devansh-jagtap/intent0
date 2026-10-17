/**
 * Contract between the hand-written manifest and this demo site's backend.
 * The site itself has no intent0 code; these tests only check that what the manifest
 * promises is what the backend actually does.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { Manifest } from "@intent0/schema";
import { completeStep, currentStep, resolveAction, startFlow, type FlowRun } from "@intent0/core";
import example from "../../../examples/enterprise-portal.manifest.json";
import { resetStore } from "@/lib/demo/store";

const manifest = Manifest.parse(example);

type Handler = (request: Request) => Promise<Response>;

/** Finds the route handler for a manifest path, e.g. /api/registration/otp/send. */
async function handlerFor(method: string, path: string): Promise<Handler | undefined> {
  const mod = (await import(/* @vite-ignore */ `../src/app${path}/route.ts`)) as Record<string, unknown>;
  return typeof mod[method] === "function" ? (mod[method] as Handler) : undefined;
}

/** Calls an endpoint the way a browser would, using only what the manifest says. */
async function call(
  method: string,
  url: string,
  body: Record<string, unknown>,
  cookie?: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const { pathname, searchParams } = new URL(url);
  const handler = await handlerFor(method, pathname);
  if (!handler) throw new Error(`no ${method} handler for ${pathname}`);

  const headers: Record<string, string> = cookie ? { cookie } : {};
  let request: Request;
  if (method === "GET") {
    for (const [k, v] of Object.entries(body)) searchParams.set(k, String(v));
    request = new Request(`${url.split("?")[0]}?${searchParams}`, { headers });
  } else if (Object.values(body).some((v) => v instanceof File)) {
    const form = new FormData();
    for (const [k, v] of Object.entries(body)) form.set(k, v instanceof File ? v : String(v));
    request = new Request(url, { method, body: form, headers });
  } else {
    request = new Request(url, {
      method,
      body: JSON.stringify(body),
      headers: { ...headers, "content-type": "application/json" },
    });
  }
  const res = await handler(request);
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

/** Runs a whole flow through the real handlers, driven only by the manifest and the flow runner. */
async function runFlow(flowId: string, values: Record<string, unknown>, cookie?: string): Promise<FlowRun> {
  let run = startFlow(manifest, flowId, values);
  while (!run.done) {
    const step = currentStep(manifest, run);
    const action = resolveAction(manifest, flowId, step.id);
    if (!action) throw new Error(`step ${step.id} has no action`);
    const available = { ...run.values, ...run.outputs };
    const body = Object.fromEntries(action.sends.filter((k) => available[k] !== undefined).map((k) => [k, available[k]]));
    const res = await call(action.method, action.url, body, cookie);
    expect(res.status, `${step.id}: ${JSON.stringify(res.json)}`).toBe(200);
    run = completeStep(manifest, run, { values: {}, outputs: res.json });
  }
  return run;
}

async function signIn(): Promise<string> {
  const { POST } = await import("@/app/api/auth/login/route");
  const res = await POST();
  return res.headers.get("set-cookie")!.split(";")[0]!;
}

const registration = {
  aadhaar_number: "123412341234",
  name_on_aadhaar: "Meena Patil",
  otp: "123456",
  business_type: "proprietorship",
  business_name: "Meena's Home Bakery",
  activity_description: "Bread and cakes made at home",
  activity_code: "10710",
  pan: "ABCDE1234F",
  final_otp: "123456",
};

beforeEach(() => resetStore());

describe("manifest ↔ backend contract", () => {
  it("every action in the manifest has a matching route handler", async () => {
    for (const flow of manifest.flows) {
      for (const step of flow.steps) {
        if (!step.action) continue;
        const handler = await handlerFor(step.action.method, step.action.path);
        expect(handler, `${flow.id}.${step.id}: ${step.action.method} ${step.action.path}`).toBeTypeOf("function");
      }
    }
  });

  it("new_registration completes end to end and returns a reference number", async () => {
    const run = await runFlow("new_registration", registration);
    expect(run.outputs.reference_number).toMatch(/^DEMO-\d{4}-\d{6}$/);
  });

  it("update_details completes for a signed-in owner, with an uploaded proof", async () => {
    const cookie = await signIn();
    const run = await runFlow(
      "update_details",
      {
        reference_number: "DEMO-2026-000001",
        update_otp: "123456",
        new_address: "4 Station Road, Pune",
        address_proof: new File(["proof"], "proof.pdf", { type: "application/pdf" }),
      },
      cookie,
    );
    expect(run.outputs.update_request_id).toBeTruthy();
  });

  it("print_certificate returns the certificate for a signed-in owner", async () => {
    const cookie = await signIn();
    const run = await runFlow("print_certificate", { certificate_reference: "DEMO-2026-000001" }, cookie);
    expect(run.outputs.certificate_id).toBe("CERT-000001");
  });
});

describe("the backend protects itself", () => {
  const url = (path: string) => `http://localhost:3000${path}`;

  it("rejects a wrong OTP", async () => {
    const sent = await call("POST", url("/api/registration/otp/send"), {
      aadhaar_number: "123412341234",
      name_on_aadhaar: "Meena",
    });
    const res = await call("POST", url("/api/registration/otp/verify"), {
      otp_request_id: sent.json.otp_request_id,
      otp: "000000",
    });
    expect(res.status).toBe(400);
  });

  it("rejects business details without a verified OTP", async () => {
    const res = await call("POST", url("/api/registration/details"), {
      applicant_token: "made_up",
      business_type: "proprietorship",
      business_name: "X",
      activity_description: "Y",
      activity_code: "1",
      pan: "ABCDE1234F",
    });
    expect(res.status).toBe(401);
  });

  it("rejects invalid input with field errors", async () => {
    const res = await call("POST", url("/api/registration/otp/send"), { aadhaar_number: "12", name_on_aadhaar: "" });
    expect(res.status).toBe(422);
    expect(Object.keys(res.json.fieldErrors as object)).toEqual(expect.arrayContaining(["aadhaar_number", "name_on_aadhaar"]));
  });

  it("won't submit the same application twice", async () => {
    let run = startFlow(manifest, "new_registration", registration);
    // Walk to the last step by hand, then submit twice.
    const outputs: Record<string, unknown> = {};
    for (const stepId of ["identity", "verify_otp", "business_details"]) {
      const action = resolveAction(manifest, "new_registration", stepId)!;
      const data = { ...registration, ...outputs };
      const body = Object.fromEntries(action.sends.map((k) => [k, data[k as keyof typeof data]]));
      const res = await call(action.method, action.url, body);
      Object.assign(outputs, res.json);
      run = completeStep(manifest, run, { values: {}, outputs: res.json });
    }
    const submit = { draft_id: outputs.draft_id, final_otp: "123456" };
    expect((await call("POST", url("/api/registration/submit"), submit)).status).toBe(200);
    expect((await call("POST", url("/api/registration/submit"), submit)).status).toBe(409);
  });

  it("rejects signed-in endpoints without a session", async () => {
    const res = await call("POST", url("/api/update/otp/send"), { reference_number: "DEMO-2026-000001" });
    expect(res.status).toBe(401);
  });
});
