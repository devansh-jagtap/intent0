"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Label } from "@/components/ui/label";

export type FieldErrors = Record<string, string[] | undefined>;
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors: FieldErrors };

/** Calls the portal's own API from the browser. */
export async function callApi<T = Record<string, unknown>>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown> | FormData,
): Promise<ApiResult<T>> {
  let url = path;
  const init: RequestInit = { method, credentials: "same-origin" };
  if (method === "GET" && body && !(body instanceof FormData)) {
    url += `?${new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]))}`;
  } else if (body instanceof FormData) {
    init.body = body;
  } else if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "content-type": "application/json" };
  }
  try {
    const res = await fetch(url, init);
    const json = (await res.json()) as Record<string, unknown>;
    if (res.ok) return { ok: true, data: json as T };
    return {
      ok: false,
      error: typeof json.error === "string" ? json.error : "Something went wrong.",
      fieldErrors: (json.fieldErrors as FieldErrors) ?? {},
    };
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection and try again.", fieldErrors: {} };
  }
}

/** Reads a submitted form into a plain object of strings. */
export function formValues(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  new FormData(form).forEach((v, k) => {
    if (typeof v === "string") out[k] = v.trim();
  });
  return out;
}

export function Field({
  label,
  htmlFor,
  error,
  help,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[200px_1fr] sm:items-start">
      <Label htmlFor={htmlFor} className="sm:pt-2">
        {label}
      </Label>
      <div className="grid gap-1">
        {children}
        {help && <p className="text-xs text-slate-500">{help}</p>}
        {error?.map((e) => (
          <p key={e} className="text-xs text-red-700">
            {e}
          </p>
        ))}
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="border border-red-300 bg-red-50 text-red-800 text-sm rounded px-3 py-2">
      {message}
    </p>
  );
}

/** "Step 2 of 4" header used by the traditional multi-page forms. */
export function StepTrail({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="mb-5">
      <p className="text-xs text-slate-500 mb-2">
        Step {current + 1} of {steps.length}
      </p>
      <ol className="flex flex-wrap gap-2 text-xs">
        {steps.map((s, i) => (
          <li
            key={s}
            className={
              i === current
                ? "px-2 py-1 rounded bg-primary text-primary-foreground"
                : i < current
                  ? "px-2 py-1 rounded bg-green-100 text-green-800"
                  : "px-2 py-1 rounded bg-slate-100 text-slate-500"
            }
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** undefined while loading, then the signed-in user or null. */
export function useSession(): string | null | undefined {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    callApi<{ user: string | null }>("GET", "/api/auth/session").then((r) => setUser(r.ok ? r.data.user : null));
  }, []);
  return user;
}

export function LoginRequired({ next }: { next: string }) {
  return (
    <div className="text-sm space-y-2">
      <p>You must be logged in to use this service.</p>
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-primary font-medium hover:underline">
        » Login to continue
      </Link>
    </div>
  );
}
