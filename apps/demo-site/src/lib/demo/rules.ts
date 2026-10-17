import { z } from "zod";
import { BUSINESS_TYPES } from "./store";

/**
 * The portal backend's own input rules. They protect the backend no matter which
 * frontend calls it: the old forms, intent0's generated pages, or anything else.
 */

const required = (label: string) => z.string().trim().min(1, `${label} is required`);
const otp = z.string().regex(/^\d{6}$/, "OTP must be 6 digits");

export const OtpSendBody = z.object({
  aadhaar_number: z.string().regex(/^\d{12}$/, "Aadhaar number must be 12 digits"),
  name_on_aadhaar: required("Name"),
});

export const OtpVerifyBody = z.object({
  otp_request_id: required("OTP request"),
  otp,
});

export const DetailsBody = z.object({
  applicant_token: required("Applicant token"),
  business_type: z.enum(BUSINESS_TYPES, { message: "Choose a type of business" }),
  business_name: required("Business name"),
  activity_description: required("Description"),
  activity_code: required("Activity code"),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN must look like ABCDE1234F"),
});

export const SubmitBody = z.object({
  draft_id: required("Draft"),
  final_otp: otp,
});

export const UpdateOtpSendBody = z.object({
  reference_number: required("Registration reference"),
});

export const UpdateOtpVerifyBody = z.object({
  otp_request_id: required("OTP request"),
  update_otp: otp,
});

export const UpdateSubmitBody = z
  .object({
    update_token: required("Update token"),
    new_address: z.string().trim().optional(),
    new_mobile: z.string().regex(/^\d{10}$/, "Mobile number must be 10 digits").optional(),
    address_proof: z.instanceof(File).optional(),
  })
  .refine((b) => b.new_address || b.new_mobile, {
    message: "Give a new address or a new mobile number",
    path: ["new_address"],
  })
  .refine((b) => !b.new_address || b.address_proof, {
    message: "Upload an address proof for the new address",
    path: ["address_proof"],
  });

export const CancelBody = z.object({
  cancel_reference: required("Registration reference"),
});
