"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FormError,
  LoginRequired,
  StepTrail,
  callApi,
  formValues,
  useSession,
  type FieldErrors,
} from "@/components/portal/form-kit";

const STEPS = ["Verify Registration", "OTP Validation", "Particulars to Update"];

export function UpdateForm() {
  const user = useSession();
  const [step, setStep] = useState(0);
  const [otpRequestId, setOtpRequestId] = useState<string>();
  const [updateToken, setUpdateToken] = useState<string>();
  const [done, setDone] = useState<string>();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  if (user === undefined) return <p className="text-sm text-slate-500">Loading…</p>;
  if (user === null) return <LoginRequired next="/update" />;
  if (done) {
    return (
      <p className="text-sm text-green-800">
        Your request has been received. Request ID: <b className="font-mono">{done}</b>
      </p>
    );
  }

  async function handle(event: FormEvent<HTMLFormElement>, run: (form: HTMLFormElement) => Promise<void>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    await run(event.currentTarget);
    setBusy(false);
  }

  function fail(r: { error: string; fieldErrors: FieldErrors }) {
    setError(r.error);
    setFieldErrors(r.fieldErrors);
  }

  return (
    <div>
      <StepTrail steps={STEPS} current={step} />
      <div className="space-y-4">
        <FormError message={error} />

        {step === 0 && (
          <form
            className="grid gap-4"
            onSubmit={(e) =>
              handle(e, async (form) => {
                const r = await callApi<{ otp_request_id: string }>("POST", "/api/update/otp/send", formValues(form));
                if (!r.ok) return fail(r);
                setOtpRequestId(r.data.otp_request_id);
                setStep(1);
              })
            }
          >
            <Field label="Registration Reference *" htmlFor="reference_number" error={fieldErrors.reference_number} help="e.g. DEMO-2026-000001">
              <Input id="reference_number" name="reference_number" />
            </Field>
            <div>
              <Button type="submit" disabled={busy}>
                Get OTP
              </Button>
            </div>
          </form>
        )}

        {step === 1 && (
          <form
            className="grid gap-4"
            onSubmit={(e) =>
              handle(e, async (form) => {
                const r = await callApi<{ update_token: string }>("POST", "/api/update/otp/verify", {
                  otp_request_id: otpRequestId,
                  update_otp: formValues(form).update_otp,
                });
                if (!r.ok) return fail(r);
                setUpdateToken(r.data.update_token);
                setStep(2);
              })
            }
          >
            <Field label="Enter OTP *" htmlFor="update_otp" error={fieldErrors.update_otp}>
              <Input id="update_otp" name="update_otp" inputMode="numeric" maxLength={6} />
            </Field>
            <div>
              <Button type="submit" disabled={busy}>
                Validate OTP
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form
            className="grid gap-4"
            onSubmit={(e) =>
              handle(e, async (form) => {
                const data = new FormData(form);
                data.set("update_token", updateToken ?? "");
                const r = await callApi<{ update_request_id: string }>("POST", "/api/update/submit", data);
                if (!r.ok) return fail(r);
                setDone(r.data.update_request_id);
              })
            }
          >
            <Field label="New Address" htmlFor="new_address" error={fieldErrors.new_address}>
              <Textarea id="new_address" name="new_address" rows={3} />
            </Field>
            <Field label="Address Proof" htmlFor="address_proof" error={fieldErrors.address_proof} help="PDF or image, required for a new address">
              <Input id="address_proof" name="address_proof" type="file" />
            </Field>
            <Field label="New Mobile Number" htmlFor="new_mobile" error={fieldErrors.new_mobile}>
              <Input id="new_mobile" name="new_mobile" inputMode="numeric" maxLength={10} />
            </Field>
            <div>
              <Button type="submit" disabled={busy}>
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
