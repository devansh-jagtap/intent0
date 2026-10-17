"use client";

// intent0 layer, added on top of the existing site. Passes the site's own components
// so generated pages look like the rest of the portal.
import { Intent0Layer } from "@intent0/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const kit = { Button, Input, Textarea };

export function Intent0Bar() {
  return <Intent0Layer endpoint="/intent0" kit={kit} />;
}
