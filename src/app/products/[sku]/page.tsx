import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import ProductArt from "@/components/ProductArt";
import StockPill from "@/components/StockPill";
import AddToCart from "@/components/AddToCart";
import SubscribeButton from "@/components/SubscribeButton";
import type { InventoryItem, Product } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductPage(
  props: PageProps<"/products/[sku]">,
) {
  const { sku } = await props.params;

  let product: Product;
  try {
    product = await api.getProduct(sku);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  let stock: number | undefined = undefined;
  try {
    const inv: InventoryItem = await api
      .getInventory(product.id)
      .catch(() => api.getInventory(product.sku));
    stock = inv?.stockQuantity;
  } catch {
    stock = undefined;
  }

  const notes = [
    { k: "Origin", v: humanFromSku(product.sku, "origin") },
    { k: "Process", v: humanFromSku(product.sku, "process") },
    { k: "Format", v: humanFromSku(product.sku, "format") },
    {
      k: "Type",
      v:
        product.type === "recurring"
          ? `Recurring · ${product.billingInterval ?? "cycle"}`
          : "One-time purchase",
    },
    { k: "Currency", v: product.currency.toUpperCase() },
    { k: "SKU", v: product.sku },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link href="/" className="stamp inline-flex items-center gap-1.5 mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="ticket rounded-3xl overflow-hidden relative aspect-square">
          <ProductArt seed={product.sku} className="absolute inset-0 h-full w-full" />
          <div className="absolute top-4 left-4 mono text-[10px] uppercase tracking-widest bg-ink text-cream px-2 py-1 rounded-full">
            {product.type === "recurring"
              ? `subscribe · ${product.billingInterval ?? "recurring"}`
              : "one-time"}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="stamp mb-2">§ Detail</div>
          <h1 className="display text-5xl md:text-6xl leading-[0.95] tracking-tighter">
            {product.name}
          </h1>
          <div className="mt-4 flex items-center gap-4">
            <div className="display text-4xl">
              {formatMoney(product.unitPrice, product.currency)}
            </div>
            {product.type === "recurring" && (
              <div className="stamp">per {product.billingInterval}</div>
            )}
            <StockPill stock={stock} />
          </div>

          {product.description && (
            <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-lg">
              {product.description}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-4">
            {product.type === "recurring" && <SubscribeButton product={product} />}
            <AddToCart product={product} stock={stock} />
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-ink/15 pt-6">
            {notes.map((n) => (
              <div key={n.k} className="flex flex-col">
                <dt className="stamp">{n.k}</dt>
                <dd className="mono text-sm mt-0.5">{n.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

// A little friendly guessing so the detail page has extra texture even though
// the API doesn't return these fields.
function humanFromSku(sku: string, kind: "origin" | "process" | "format"): string {
  const s = sku.toLowerCase();
  if (kind === "origin") {
    if (s.includes("ethiopia")) return "Yirgacheffe, Ethiopia";
    if (s.includes("colombia")) return "Huila, Colombia";
    if (s.includes("guatemala")) return "Antigua, Guatemala";
    if (s.includes("kenya")) return "Nyeri, Kenya";
    if (s.includes("brazil")) return "Cerrado, Brazil";
    return "Blend · rotating origins";
  }
  if (kind === "process") {
    if (s.includes("natural")) return "Natural";
    if (s.includes("honey")) return "Honey";
    if (s.includes("washed")) return "Washed";
    return "Washed";
  }
  const match = s.match(/(\d+)(g|kg|ml|oz)/);
  if (match) return `${match[1]}${match[2]}`;
  return "250g bag";
}
