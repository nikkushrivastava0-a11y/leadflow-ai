import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-origin";

export default function robots(): MetadataRoute.Robots {
  // Preview sites should never be indexed. This is not a security boundary.
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/login", "/form", "/auth", "/api", "/agent-studio"],
    },
    sitemap: getSiteOrigin() + "/sitemap.xml",
  };
}
