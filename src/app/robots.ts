import type { MetadataRoute } from "next";
import { siteUrl } from "@/shared/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/concepts"],
      disallow: [
        "/api/",
        "/auth/",
        "/admin",
        "/guard",
        "/invites/",
        "/live",
        "/login",
        "/projects",
        "/specs",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
