// intent0's server part for this website, shared by /intent0/* and the machine routes (/llms.txt).
// The model key stays on the server (.env.local).
import { createIntent0Handler, modelFromEnv } from "@intent0/adapter";
import { Manifest, SiteMemory } from "@intent0/schema";
import manifestJson from "../../intent0.manifest.json";
import memoryJson from "../../intent0.memory.json";

export const handleIntent0 = createIntent0Handler({
  manifest: Manifest.parse(manifestJson),
  memory: SiteMemory.parse(memoryJson),
  model: modelFromEnv(process.env),
});

/** Where this website is published. Used for absolute links in robots.txt and the sitemap. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
