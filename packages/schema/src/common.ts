import * as z from "zod";

/** Identifiers used for flows, steps, fields and outputs: lowercase snake_case. */
export const Id = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, "use lowercase letters, digits and underscores, starting with a letter");

/**
 * A key exactly as the website's API uses it: a form field name or a JSON response key.
 * Case is kept ("referenceId", "full_name"), because intent0 sends and reads these verbatim.
 */
export const Key = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "use the exact key name (letters, digits, underscores)");

/** Names inside {braces} in a path, e.g. "/api/status/{referenceId}" → ["referenceId"]. */
export function pathParams(path: string): string[] {
  return [...path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((m) => m[1]!);
}

/**
 * A path on the company's own site, e.g. "/api/registration/otp/send".
 * Must start with a single "/" so it can never point at another host ("//evil.example").
 */
export const SitePath = z
  .string()
  .regex(/^\/(?!\/)[^\s]*$/, "must be a path on the same site, starting with a single /");

/** Turns Zod issues into short "path: message" lines for logs and tests. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}
