import { Manifest } from "@intent0/schema";
import example from "../../../examples/enterprise-portal.manifest.json";

export const manifest = Manifest.parse(example);

/** A page for step "identity" of new_registration that should pass every check. */
export const validIdentityPage = {
  flowId: "new_registration",
  stepId: "identity",
  lang: "en",
  title: "Verify identity",
  blocks: [
    { component: "Stepper", props: { steps: ["Identity", "OTP", "Business", "Review"], current: 0 } },
    { component: "Heading", props: { text: "Verify identity", level: 2 } },
    {
      component: "Group",
      props: { label: "Your details" },
      children: [
        { component: "TextField", props: { label: "Aadhaar number" }, bind: "aadhaar_number" },
        { component: "TextField", props: { label: "Name as on Aadhaar" }, bind: "name_on_aadhaar" },
      ],
    },
    { component: "SubmitButton", props: { label: "Send OTP" } },
  ],
};
