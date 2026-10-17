import { z } from "zod";
import { DEMO_USER, db } from "./store";

export const SESSION_COOKIE = "demo_session";

export function ok(data: Record<string, unknown>, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function fail(status: number, error: string, fieldErrors?: Record<string, string[]>): Response {
  return Response.json(fieldErrors ? { error, fieldErrors } : { error }, { status });
}

/** Reads JSON or form data into a plain object. Empty strings and empty files are dropped. */
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      const out: Record<string, unknown> = {};
      for (const [key, value] of form.entries()) {
        if (typeof value === "string" ? value.trim() === "" : value.size === 0) continue;
        out[key] = value;
      }
      return out;
    }
    const json: unknown = await request.json();
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    return Object.fromEntries(
      Object.entries(json).filter(([, v]) => !(typeof v === "string" && v.trim() === "")),
    );
  } catch {
    return null;
  }
}

/** Validates the request body; on failure returns a ready 4xx response. */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T; response?: never } | { data?: never; response: Response }> {
  const body = await readBody(request);
  if (!body) return { response: fail(400, "Send the request body as JSON or form data.") };
  const result = schema.safeParse(body);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    return { response: fail(422, "Some fields are invalid.", fieldErrors as Record<string, string[]>) };
  }
  return { data: result.data };
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** The signed-in user for this request, or null. */
export function sessionUser(request: Request): string | null {
  const token = readCookie(request, SESSION_COOKIE);
  return token && db().sessions.has(token) ? DEMO_USER : null;
}

export function requireUser(request: Request): { user: string; response?: never } | { user?: never; response: Response } {
  const user = sessionUser(request);
  return user ? { user } : { response: fail(401, "Please sign in first.") };
}
