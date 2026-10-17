export type FallbackReason = "timeout" | "error" | "invalid";

export type Outcome<T> =
  | { kind: "ok"; value: T }
  | { kind: "fallback"; url: string; reason: FallbackReason; detail: string[] };

export interface FallbackOptions<T> {
  timeoutMs: number;
  fallbackUrl: string;
  /** Deterministic check of the result, e.g. validatePage. A failed check means fallback. */
  check?: (value: T) => { ok: true } | { ok: false; errors: string[] };
}

/**
 * Runs a generation task and turns every way it can go wrong (too slow, throws, produces
 * something invalid) into "send the user to the original page". The user is never stuck.
 */
export async function withFallback<T>(
  task: (signal: AbortSignal) => Promise<T>,
  options: FallbackOptions<T>,
): Promise<Outcome<T>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), options.timeoutMs);
  });

  try {
    const result = await Promise.race([task(controller.signal).then((value) => ({ value })), timeout]);
    if (result === "timeout") {
      controller.abort();
      return {
        kind: "fallback",
        url: options.fallbackUrl,
        reason: "timeout",
        detail: [`no result after ${options.timeoutMs} ms`],
      };
    }
    if (options.check) {
      const verdict = options.check(result.value);
      if (!verdict.ok) return { kind: "fallback", url: options.fallbackUrl, reason: "invalid", detail: verdict.errors };
    }
    return { kind: "ok", value: result.value };
  } catch (err) {
    return {
      kind: "fallback",
      url: options.fallbackUrl,
      reason: "error",
      detail: [err instanceof Error ? err.message : String(err)],
    };
  } finally {
    clearTimeout(timer);
  }
}
