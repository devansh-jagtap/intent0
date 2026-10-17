import { describe, expect, it } from "vitest";
import { FlowError, completeStep, currentStep, goBack, startFlow } from "../src/index.js";
import { manifest } from "./fixtures.js";

const identity = { values: { aadhaar_number: "123412341234", name_on_aadhaar: "Meena Patil" } };

describe("flow runner", () => {
  it("starts at the first step", () => {
    const run = startFlow(manifest, "new_registration");
    expect(currentStep(manifest, run).id).toBe("identity");
  });

  it("refuses to start a disabled flow", () => {
    expect(() => startFlow(manifest, "cancel_registration")).toThrow(FlowError);
  });

  it("won't move past identity until the backend returns an OTP request id", () => {
    const run = startFlow(manifest, "new_registration");
    expect(() => completeStep(manifest, run, { ...identity, outputs: {} })).toThrow(/otp_request_id/);
  });

  it("won't accept a step with a required field left empty", () => {
    const run = startFlow(manifest, "new_registration");
    expect(() =>
      completeStep(manifest, run, { values: { aadhaar_number: "123412341234" }, outputs: { otp_request_id: "r1" } }),
    ).toThrow(/name_on_aadhaar/);
  });

  it("walks the steps in order, carrying outputs forward", () => {
    let run = startFlow(manifest, "new_registration");
    run = completeStep(manifest, run, { ...identity, outputs: { otp_request_id: "r1" } });
    expect(currentStep(manifest, run).id).toBe("verify_otp");

    run = completeStep(manifest, run, { values: { otp: "123456" }, outputs: { applicant_token: "t1" } });
    run = completeStep(manifest, run, {
      values: {
        business_type: "proprietorship",
        business_name: "Meena's Home Bakery",
        activity_description: "Bread and cakes",
        activity_code: "10710",
        pan: "ABCDE1234F",
      },
      outputs: { draft_id: "d1" },
    });
    run = completeStep(manifest, run, { values: { final_otp: "654321" }, outputs: { reference_number: "DEMO-1" } });

    expect(run.done).toBe(true);
    expect(run.outputs.reference_number).toBe("DEMO-1");
  });

  it("going back discards outputs from the step being redone, but keeps typed values", () => {
    let run = startFlow(manifest, "new_registration");
    run = completeStep(manifest, run, { ...identity, outputs: { otp_request_id: "r1" } });
    run = completeStep(manifest, run, { values: { otp: "123456" }, outputs: { applicant_token: "t1" } });
    expect(currentStep(manifest, run).id).toBe("business_details");

    run = goBack(run);
    expect(currentStep(manifest, run).id).toBe("verify_otp");
    expect(run.outputs.applicant_token).toBeUndefined();
    expect(run.outputs.otp_request_id).toBe("r1");
    expect(run.values.otp).toBe("123456");
  });

  it("uses prefill from the intent as starting values", () => {
    const run = startFlow(manifest, "new_registration", { activity_description: "bakery" });
    expect(run.values.activity_description).toBe("bakery");
  });
});
