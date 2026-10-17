import type { ComponentCatalog } from "@intent0/schema";

/**
 * intent0's own building blocks, used by the script tag (which can't reach a company's
 * React components). Styled later from the site's global CSS. Select options always come
 * from the manifest field, so there is no "options" prop for the model to fill in.
 */
export const builtinCatalog: ComponentCatalog = {
  components: [
    { name: "Heading", source: "builtin", props: { text: "string", level: "number" }, container: false, accepts: [], submit: false },
    { name: "Text", source: "builtin", props: { text: "string" }, container: false, accepts: [], submit: false },
    { name: "Notice", source: "builtin", props: { text: "string", tone: "string" }, container: false, accepts: [], submit: false },
    { name: "Group", source: "builtin", props: { label: "string" }, container: true, accepts: [], submit: false },
    { name: "Stepper", source: "builtin", props: { steps: "string[]", current: "number" }, container: false, accepts: [], submit: false },
    {
      name: "TextField",
      source: "builtin",
      props: { label: "string", placeholder: "string", help: "string" },
      container: false,
      accepts: ["text", "email", "phone", "number"],
      submit: false,
    },
    { name: "TextArea", source: "builtin", props: { label: "string", help: "string" }, container: false, accepts: ["textarea"], submit: false },
    { name: "SelectField", source: "builtin", props: { label: "string", help: "string" }, container: false, accepts: ["select", "radio"], submit: false },
    { name: "DateField", source: "builtin", props: { label: "string", help: "string" }, container: false, accepts: ["date"], submit: false },
    { name: "FileField", source: "builtin", props: { label: "string", help: "string" }, container: false, accepts: ["file"], submit: false },
    { name: "OtpField", source: "builtin", props: { label: "string", length: "number" }, container: false, accepts: ["otp"], submit: false },
    { name: "Checkbox", source: "builtin", props: { label: "string" }, container: false, accepts: ["checkbox"], submit: false },
    { name: "SubmitButton", source: "builtin", props: { label: "string" }, container: false, accepts: [], submit: true },
  ],
};
