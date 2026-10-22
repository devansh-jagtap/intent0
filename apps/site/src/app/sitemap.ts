import type { MetadataRoute } from "next";
import { allDocs } from "@/lib/docs";
import { SITE_URL } from "@/lib/intent0";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    ...allDocs().map((d) => ({ url: `${SITE_URL}/docs/${d.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/llms.txt`, changeFrequency: "weekly" as const, priority: 0.5 },
  ];
}
