import type { ComponentType, ReactNode } from "react";

/**
 * The site's own basic components. With the SDK, a company passes its real Input,
 * Button, etc., so generated pages look like the rest of the site. Anything not
 * passed falls back to a plain HTML element.
 */
export interface Intent0Kit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Input?: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Textarea?: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button?: ComponentType<any>;
}

export function resolveKit(kit: Intent0Kit = {}) {
  return {
    Input: kit.Input ?? ((p: Record<string, unknown>) => <input className="i0-input" {...p} />),
    Textarea: kit.Textarea ?? ((p: Record<string, unknown>) => <textarea className="i0-input" {...p} />),
    Button:
      kit.Button ??
      ((p: { children?: ReactNode } & Record<string, unknown>) => <button className="i0-button" {...p} />),
  };
}

export type ResolvedKit = ReturnType<typeof resolveKit>;
