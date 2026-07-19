import Link from "next/link";
import { api } from "@/lib/api";
import type { Product, InventoryItem } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import Ticker from "@/components/Ticker";
import Notice from "@/components/Notice";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];
  let inventory: InventoryItem[] = [];
  let error: string | null = null;
  try {
    const [p, inv] = await Promise.all([api.listProducts(), api.listInventory()]);
    products = p;
    inventory = inv;
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load catalog";
  }

  const stockByKey = new Map(
    inventory.map((i) => [i.productId, i.stockQuantity]),
  );
  const stockFor = (p: Product) =>
    stockByKey.get(p.id) ?? stockByKey.get(p.sku);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-ink/15">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-8">
            <div className="stamp mb-4">Vol. 1 · Iss. 07 · The Roast Journal</div>
            <h1 className="display text-[clamp(2.5rem,7vw,6.5rem)] leading-[0.95] tracking-tighter">
              Slow coffee,
              <br />
              <span className="italic text-ember">fast</span> checkout.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft leading-relaxed">
              Micro-lot beans, roasted in small batches, shipped the day after
              they cool. Every order carries an append-only receipt — you can
              watch the roast, the pack, the ship, in real time.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="#catalog" className="btn-primary">
                Browse the catalog <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/orders" className="btn-ghost">
                Track an order
              </Link>
            </div>
          </div>
          <div className="md:col-span-4 flex flex-col gap-3 mono text-xs text-ink-soft">
            <div className="flex justify-between border-b border-ink/15 pb-2">
              <span>ORIGIN</span>
              <span>ETHIOPIA · GUATEMALA · COLOMBIA</span>
            </div>
            <div className="flex justify-between border-b border-ink/15 pb-2">
              <span>METHOD</span>
              <span>WASHED · NATURAL · HONEY</span>
            </div>
            <div className="flex justify-between border-b border-ink/15 pb-2">
              <span>ROAST</span>
              <span>LIGHT — MEDIUM</span>
            </div>
            <div className="flex justify-between">
              <span>SHIPS</span>
              <span>WITHIN 24H OF ROAST</span>
            </div>
          </div>
        </div>
      </section>

      <Ticker />

      <section id="catalog" className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="stamp">§ Catalog</div>
            <h2 className="display text-4xl md:text-5xl mt-1">
              What we&apos;re pouring
            </h2>
          </div>
          <div className="mono text-xs text-ink-mute hidden sm:block">
            {products.length} lots · updated live from the roastery
          </div>
        </div>

        {error && (
          <Notice title="Catalog offline" tone="error">
            {error}. The API at{" "}
            <code className="mono">paycartbackend-production.up.railway.app</code>{" "}
            did not respond.
          </Notice>
        )}

        {!error && products.length === 0 && (
          <Notice title="The shelves are empty" tone="warn">
            No active products returned by the API. Check{" "}
            <code className="mono">/products</code>.
          </Notice>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
          {products.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              stock={stockFor(p)}
              index={i}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-ink/15 bg-paper-2">
        <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="stamp mb-3">§ Field notes</div>
            <h3 className="display text-4xl leading-tight">
              Every order is an event stream.
            </h3>
            <p className="mt-4 text-ink-soft leading-relaxed">
              We don&apos;t hide the fulfillment behind a black box. When you
              buy a bag, the backend writes an append-only ledger — pending,
              payment received, preparing, shipped. You can watch each row land
              as it happens.
            </p>
            <Link href="/orders" className="btn-ghost mt-6 inline-flex">
              See a live timeline →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: "Stripe", v: "PaymentIntents · idempotent" },
              { k: "Auth", v: "JWT bearer" },
              { k: "Ledger", v: "Append-only events" },
              { k: "Stock", v: "Decrements on paid" },
            ].map((c) => (
              <div key={c.k} className="ticket rounded-xl p-4">
                <div className="stamp">{c.k}</div>
                <div className="mono text-sm mt-1">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
