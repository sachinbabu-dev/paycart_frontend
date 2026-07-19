"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/stores";
import type { Product } from "@/lib/types";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

interface Props {
  product: Product;
  stock: number | undefined;
}

export default function AddToCart({ product, stock }: Props) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const router = useRouter();
  const add = useCart((s) => s.add);
  const disabled = stock !== undefined && stock <= 0;
  const maxQty = stock ?? 99;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-ink/20 rounded-full bg-cream">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-ink/5 transition"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="mono w-8 text-center tabular-nums">{qty}</span>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-ink/5 transition"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            aria-label="Increase"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          disabled={disabled}
          className="btn-primary flex-1 justify-center"
          onClick={() => {
            add(product, qty);
            setAdded(true);
            setTimeout(() => setAdded(false), 1400);
          }}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> Added
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              {disabled ? "Sold out" : "Add to bag"}
            </>
          )}
        </button>
      </div>
      <button
        type="button"
        disabled={disabled}
        className="btn-ghost justify-center"
        onClick={() => {
          add(product, qty);
          router.push("/cart");
        }}
      >
        Buy now →
      </button>
    </div>
  );
}
