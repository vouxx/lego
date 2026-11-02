import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Product = { id: string; name: string; price: number; description_html: string | null };

export function ProductDescription({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price, description_html")
      .eq("id", productId)
      .single()
      .then(({ data }) => setProduct(data));
  }, [productId]);

  if (!product) return <p>불러오는 중…</p>;

  return (
    <section>
      <h1 className="text-2xl font-bold">{product.name}</h1>
      <p className="text-lg">{product.price.toLocaleString()}원</p>
      <div className="prose" dangerouslySetInnerHTML={{ __html: product.description_html ?? "" }} />
    </section>
  );
}
