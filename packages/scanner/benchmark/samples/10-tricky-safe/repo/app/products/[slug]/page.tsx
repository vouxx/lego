import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { createClient } from "@/lib/supabase/server";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("name, description_html, price, image_url")
    .eq("slug", slug)
    .single();
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image_url,
    offers: { "@type": "Offer", price: product.price, priceCurrency: "KRW" },
  };
  const safeDescription = DOMPurify.sanitize(product.description_html ?? "");

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h1>{product.name}</h1>
      <div className="prose" dangerouslySetInnerHTML={{ __html: safeDescription }} />
    </main>
  );
}
