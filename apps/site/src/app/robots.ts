import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/intent0";

// Open to search engines and AI crawlers alike. The dashboard has nothing to index (it's per-computer).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/intent0/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
