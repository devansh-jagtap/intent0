import type { Manifest, Step } from "@intent0/schema";
import { findFlow } from "./lookup.js";

/** Where a user is in a flow. Plain data, so it can be stored and resumed. */
export interface FlowRun {
  flowId: string;
  stepIndex: number;
  /** What the user entered, by field name. Kept when going back, so forms stay filled. */
  values: Record<string, unknown>;
  /** What the backend returned, by output name, e.g. otp_request_id. */
  outputs: Record<string, unknown>;
  /** Which step produced each output, so going back can discard them. */
  producedBy: Record<string, number>;
  done: boolean;
}

export class FlowError extends Error {
  override name = "FlowError";
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function flowOf(manifest: Manifest, flowId: string) {
  const flow = findFlow(manifest, flowId);
  if (!flow) throw new FlowError(`unknown flow "${flowId}"`);
  if (!flow.enabled) throw new FlowError(`flow "${flowId}" is disabled`);
  return flow;
}

export function startFlow(manifest: Manifest, flowId: string, prefill: Record<string, unknown> = {}): FlowRun {
  flowOf(manifest, flowId);
  return { flowId, stepIndex: 0, values: { ...prefill }, outputs: {}, producedBy: {}, done: false };
}

export function currentStep(manifest: Manifest, run: FlowRun): Step {
  const step = flowOf(manifest, run.flowId).steps[run.stepIndex];
  if (!step) throw new FlowError(`flow "${run.flowId}" has no step ${run.stepIndex}`);
  return step;
}

/** Outputs the current step needs that earlier steps haven't produced yet. */
export function missingNeeds(step: Step, outputs: Record<string, unknown>): string[] {
  return step.needs.filter((n) => isEmpty(outputs[n]));
}

/**
 * Records a successful backend response for the current step and moves to the next.
 * There is deliberately no "go to step N": the only ways to move are forward (after
 * the backend answered) and back. So a flow can't skip OTP or verification.
 */
export function completeStep(
  manifest: Manifest,
  run: FlowRun,
  result: { values: Record<string, unknown>; outputs: Record<string, unknown> },
): FlowRun {
  if (run.done) throw new FlowError("flow is already finished");
  const flow = flowOf(manifest, run.flowId);
  const step = currentStep(manifest, run);

  const missing = missingNeeds(step, run.outputs);
  if (missing.length > 0) throw new FlowError(`step "${step.id}" can't run yet; missing ${missing.join(", ")}`);

  const values = { ...run.values, ...result.values };
  for (const field of step.fields) {
    if (field.required && isEmpty(values[field.name])) {
      throw new FlowError(`step "${step.id}": "${field.name}" is required`);
    }
  }

  const expected = step.action?.returns ?? [];
  const absent = expected.filter((name) => isEmpty(result.outputs[name]));
  if (absent.length > 0) {
    throw new FlowError(`step "${step.id}": backend did not return ${absent.join(", ")}`);
  }

  const outputs = { ...run.outputs };
  const producedBy = { ...run.producedBy };
  for (const name of expected) {
    outputs[name] = result.outputs[name];
    producedBy[name] = run.stepIndex;
  }

  const isLast = run.stepIndex === flow.steps.length - 1;
  return {
    ...run,
    values,
    outputs,
    producedBy,
    stepIndex: isLast ? run.stepIndex : run.stepIndex + 1,
    done: isLast,
  };
}

/**
 * Steps back one step. Outputs from that step onward are discarded, because the user
 * will redo it (e.g. a new OTP request). Entered values are kept for convenience.
 */
export function goBack(run: FlowRun): FlowRun {
  if (run.done) throw new FlowError("flow is already finished");
  if (run.stepIndex === 0) return run;
  const target = run.stepIndex - 1;
  const outputs: Record<string, unknown> = {};
  const producedBy: Record<string, number> = {};
  for (const [name, index] of Object.entries(run.producedBy)) {
    if (index < target) {
      outputs[name] = run.outputs[name];
      producedBy[name] = index;
    }
  }
  return { ...run, stepIndex: target, outputs, producedBy };
}
