import type { MetadataRoute } from "next";
import { getConceptList } from "@/features/concepts/services/views";
import { siteUrl } from "@/shared/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const concepts = await getConceptList();
  return [
    { url: base },
    { url: `${base}/concepts` },
    ...concepts.map((c) => ({ url: `${base}/concepts/${c.slug}` })),
  ];
}
