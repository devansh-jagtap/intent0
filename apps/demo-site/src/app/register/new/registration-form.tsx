"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError, StepTrail, callApi, formValues, type FieldErrors } from "@/components/portal/form-kit";
import { ACTIVITY_CODES } from "@/lib/demo/activity-codes";

const STEPS = ["Aadhaar Verification", "OTP Validation", "Enterprise Details", "Declaration & Submit"];
const SELECT_CLASS = "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

interface Progress {
  otpRequestId?: string;
  applicantToken?: string;
  draftId?: string;
  referenceNumber?: string;
  summary?: Record<string, string>;
}

export function RegistrationForm() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState<Progress>({});
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>, run: (values: Record<string, string>) => Promise<void>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    await run(formValues(event.currentTarget));
    setBusy(false);
  }

  function fail(result: { error: string; fieldErrors: FieldErrors }) {
    setError(result.error);
    setFieldErrors(result.fieldErrors);
  }

  if (progress.referenceNumber) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-green-800 font-semibold">Your application has been submitted successfully.</p>
        <p>
          Registration reference: <b className="font-mono">{progress.referenceNumber}</b>
        </p>
        <p className="text-slate-600">Please note the reference number for future correspondence.</p>
      </div>
    );
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
              submit(e, async (v) => {
                const r = await callApi<{ otp_request_id: string }>("POST", "/api/registration/otp/send", v);
                if (!r.ok) return fail(r);
                setProgress({ otpRequestId: r.data.otp_request_id });
                setStep(1);
              })
            }
          >
            <Field label="Aadhaar Number *" htmlFor="aadhaar_number" error={fieldErrors.aadhaar_number} help="12-digit number">
              <Input id="aadhaar_number" name="aadhaar_number" inputMode="numeric" maxLength={12} />
            </Field>
            <Field label="Name of Entrepreneur (as per Aadhaar) *" htmlFor="name_on_aadhaar" error={fieldErrors.name_on_aadhaar}>
              <Input id="name_on_aadhaar" name="name_on_aadhaar" />
            </Field>
            <div>
              <Button type="submit" disabled={busy}>
                Validate &amp; Generate OTP
              </Button>
            </div>
          </form>
        )}

        {step === 1 && (
          <form
            className="grid gap-4"
            onSubmit={(e) =>
              submit(e, async (v) => {
                const r = await callApi<{ applicant_token: string }>("POST", "/api/registration/otp/verify", {
                  otp_request_id: progress.otpRequestId,
                  otp: v.otp,
                });
                if (!r.ok) return fail(r);
                setProgress((p) => ({ ...p, applicantToken: r.data.applicant_token }));
                setStep(2);
              })
            }
          >
            <Field label="Enter OTP *" htmlFor="otp" error={fieldErrors.otp} help="Sent to the mobile number linked with Aadhaar">
              <Input id="otp" name="otp" inputMode="numeric" maxLength={6} />
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
              submit(e, async (v) => {
                const r = await callApi<{ draft_id: string }>("POST", "/api/registration/details", {
                  applicant_token: progress.applicantToken,
                  ...v,
                });
                if (!r.ok) return fail(r);
                setProgress((p) => ({ ...p, draftId: r.data.draft_id, summary: v }));
                setStep(3);
              })
            }
          >
            <Field label="Type of Organisation *" htmlFor="business_type" error={fieldErrors.business_type}>
              <select id="business_type" name="business_type" className={SELECT_CLASS} defaultValue="">
                <option value="" disabled>
                  -- Select --
                </option>
                <option value="proprietorship">Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="llp">Limited Liability Partnership</option>
                <option value="private_limited">Private Limited Company</option>
              </select>
            </Field>
            <Field label="Name of Enterprise *" htmlFor="business_name" error={fieldErrors.business_name}>
              <Input id="business_name" name="business_name" />
            </Field>
            <Field label="Description of Activity *" htmlFor="activity_description" error={fieldErrors.activity_description}>
              <Textarea id="activity_description" name="activity_description" rows={3} />
            </Field>
            <Field
              label="Activity Code (Annexure II) *"
              htmlFor="activity_code"
              error={fieldErrors.activity_code}
              help="Select the code that best describes the main activity."
            >
              <select id="activity_code" name="activity_code" className={SELECT_CLASS} defaultValue="">
                <option value="" disabled>
                  -- Select activity code --
                </option>
                {ACTIVITY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="PAN of Enterprise *" htmlFor="pan" error={fieldErrors.pan}>
              <Input id="pan" name="pan" maxLength={10} className="uppercase" />
            </Field>
            <div>
              <Button type="submit" disabled={busy}>
                Save &amp; Continue
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form
            className="grid gap-4"
            onSubmit={(e) =>
              submit(e, async (v) => {
                const r = await callApi<{ reference_number: string }>("POST", "/api/registration/submit", {
                  draft_id: progress.draftId,
                  final_otp: v.final_otp,
                });
                if (!r.ok) return fail(r);
                setProgress((p) => ({ ...p, referenceNumber: r.data.reference_number }));
              })
            }
          >
            <dl className="grid grid-cols-[180px_1fr] gap-y-1 text-sm bg-slate-50 border rounded p-3">
              {Object.entries(progress.summary ?? {}).map(([k, val]) => (
                <div key={k} className="contents">
                  <dt className="text-slate-500">{k.replaceAll("_", " ")}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm">
              I hereby declare that the information given above is true to the best of my knowledge. An OTP has been
              sent for final submission.
            </p>
            <Field label="Final OTP *" htmlFor="final_otp" error={fieldErrors.final_otp}>
              <Input id="final_otp" name="final_otp" inputMode="numeric" maxLength={6} />
            </Field>
            <div>
              <Button type="submit" disabled={busy}>
                Submit Application
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
