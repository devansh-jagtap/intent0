"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FormError,
  LoginRequired,
  callApi,
  formValues,
  useSession,
  type FieldErrors,
} from "@/components/portal/form-kit";

export function CancelForm() {
  const user = useSession();
  const [done, setDone] = useState<string>();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  if (user === undefined) return <p className="text-sm text-slate-500">Loading…</p>;
  if (user === null) return <LoginRequired next="/cancel" />;
  if (done) {
    return (
      <p className="text-sm">
        The registration has been cancelled. Cancellation ID: <b className="font-mono">{done}</b>
      </p>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event.currentTarget);
    if (values.confirm !== "yes") {
      setError("Tick the box to confirm you understand cancellation is permanent.");
      return;
    }
    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    const r = await callApi<{ cancellation_id: string }>("POST", "/api/registration/cancel", {
      cancel_reference: values.cancel_reference,
    });
    if (r.ok) setDone(r.data.cancellation_id);
    else {
      setError(r.error);
      setFieldErrors(r.fieldErrors);
    }
    setBusy(false);
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded px-3 py-2">
        Cancellation is permanent and cannot be undone.
      </p>
      <FormError message={error} />
      <Field label="Registration Reference *" htmlFor="cancel_reference" error={fieldErrors.cancel_reference}>
        <Input id="cancel_reference" name="cancel_reference" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" value="yes" className="size-4" />I understand this cannot be undone.
      </label>
      <div>
        <Button type="submit" variant="destructive" disabled={busy}>
          Cancel Registration
        </Button>
      </div>
    </form>
  );
}
