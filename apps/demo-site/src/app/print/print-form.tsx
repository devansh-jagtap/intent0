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

interface Certificate {
  certificate_id: string;
  reference_number: string;
  business_name: string;
  business_type: string;
  owner_name: string;
  address: string;
  registered_at: string;
  status: string;
}

export function PrintForm() {
  const user = useSession();
  const [certificate, setCertificate] = useState<Certificate>();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  if (user === undefined) return <p className="text-sm text-slate-500">Loading…</p>;
  if (user === null) return <LoginRequired next="/print" />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    const r = await callApi<Certificate>("GET", "/api/certificate", formValues(event.currentTarget));
    if (r.ok) setCertificate(r.data);
    else {
      setError(r.error);
      setFieldErrors(r.fieldErrors);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Registration Reference *" htmlFor="certificate_reference" error={fieldErrors.certificate_reference}>
          <Input id="certificate_reference" name="certificate_reference" placeholder="DEMO-2026-000001" />
        </Field>
        <div>
          <Button type="submit" disabled={busy}>
            Search
          </Button>
        </div>
      </form>

      {certificate && (
        <div className="border-2 border-primary rounded p-5 text-sm space-y-2">
          <p className="text-center font-semibold text-primary">Certificate of Registration (demo)</p>
          <dl className="grid grid-cols-[180px_1fr] gap-y-1">
            <dt className="text-slate-500">Certificate No.</dt>
            <dd className="font-mono">{certificate.certificate_id}</dd>
            <dt className="text-slate-500">Reference</dt>
            <dd className="font-mono">{certificate.reference_number}</dd>
            <dt className="text-slate-500">Enterprise</dt>
            <dd>{certificate.business_name}</dd>
            <dt className="text-slate-500">Type</dt>
            <dd>{certificate.business_type}</dd>
            <dt className="text-slate-500">Owner</dt>
            <dd>{certificate.owner_name}</dd>
            <dt className="text-slate-500">Address</dt>
            <dd>{certificate.address}</dd>
            <dt className="text-slate-500">Registered on</dt>
            <dd>{certificate.registered_at}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd>{certificate.status}</dd>
          </dl>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      )}
    </div>
  );
}
