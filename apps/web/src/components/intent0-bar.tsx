"use client";

// intent0 on its own website: "Ask this site" answers from these docs (Site Memory).
import { Intent0Layer } from "@intent0/react";

export function Intent0Bar() {
  return <Intent0Layer endpoint="/intent0" />;
}
