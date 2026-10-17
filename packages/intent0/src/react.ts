import type { ComponentType, ReactElement } from "react";
import { Intent0Layer as Layer } from "@intent0/react";

// Public types are declared here (not re-exported) so the published .d.ts has no internal imports.

export interface Intent0Kit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Input?: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Textarea?: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button?: ComponentType<any>;
}

export interface Intent0LayerProps {
  /** Where the site mounted the intent0 route. Default "/intent0". */
  endpoint?: string;
  /** The site's own components, so generated pages match the site. */
  kit?: Intent0Kit;
  /** Language for generated text, e.g. "en" or "hi". */
  lang?: string;
}

/** The intent bar plus live generated step pages. Render it once, near the top of <body>. */
export const Intent0Layer: (props: Intent0LayerProps) => ReactElement | null = Layer;
