import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  // Never enumerate business slugs or private login/dashboard URLs.
  return [{ url: getSiteOrigin() + "/", changeFrequency: "monthly", priority: 1 }];
}
