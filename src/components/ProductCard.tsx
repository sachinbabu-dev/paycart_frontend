import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import ProductArt from "./ProductArt";
import StockPill from "./StockPill";

interface Props {
  product: Product;
  stock: number | undefined;
  index: number;
}

export default function ProductCard({ product, stock, index }: Props) {
  const isLarge = index % 7 === 0;
  return (
    <Link
      href={`/products/${encodeURIComponent(product.sku)}`}
      className={`group relative flex flex-col ticket rounded-2xl overflow-hidden transition-transform hover:-translate-y-1 ${
        isLarge ? "md:col-span-2 md:row-span-2" : ""
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProductArt
          seed={product.sku}
          className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="mono text-[10px] uppercase tracking-widest bg-ink text-cream px-2 py-1 rounded-full">
            {product.type === "recurring"
              ? `subscribe · ${product.billingInterval ?? "recurring"}`
              : "one-time"}
          </span>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="stamp">SKU · {product.sku}</div>
            <h3 className="display text-2xl leading-tight mt-1 group-hover:text-ember transition-colors">
              {product.name}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <div className="display text-2xl">
              {formatMoney(product.unitPrice, product.currency)}
            </div>
            {product.type === "recurring" && (
              <div className="stamp mt-0.5">
                per {product.billingInterval ?? "cycle"}
              </div>
            )}
          </div>
        </div>
        {product.description && (
          <p className="text-sm text-ink-soft line-clamp-3 leading-relaxed">
            {product.description}
          </p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <StockPill stock={stock} />
          <span className="mono text-xs text-ink-mute group-hover:text-ember transition-colors">
            open →
          </span>
        </div>
      </div>
    </Link>
  );
}
