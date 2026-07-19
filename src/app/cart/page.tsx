"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth, useCart, useRecentOrders, cartTotal } from "@/lib/stores";
import { api, ApiError } from "@/lib/api";
import { formatMoney, generateIdempotencyKey } from "@/lib/format";
import { Minus, Plus, Trash2, Loader2, ArrowRight } from "lucide-react";
import Notice from "@/components/Notice";

export default function CartPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lines = useCart((s) => s.lines);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const remove = useCart((s) => s.remove);
  const token = useAuth((s) => s.token);
  const pushOrder = useRecentOrders((s) => s.push);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { amount, currency } = cartTotal(lines);

  async function proceed() {
    setError(null);
    if (!token) {
      router.push(`/auth?next=${encodeURIComponent("/cart")}`);
      return;
    }
    if (lines.length === 0) return;
    setBusy(true);
    try {
      const order = await api.createOrder(
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        token,
      );
      pushOrder(order.id);
      // Attach a fresh idempotency key so refreshing the checkout page reuses
      // the same PaymentIntent instead of creating a duplicate.
      const key = generateIdempotencyKey();
      sessionStorage.setItem(`idem:${order.id}`, key);
      router.push(`/checkout/${order.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError("Your session expired. Please sign in again.");
        router.push(`/auth?next=${encodeURIComponent("/cart")}`);
        return;
      }
      setError(e instanceof Error ? e.message : "Could not create the order.");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) {
    return <div className="mx-auto max-w-4xl px-6 py-16" />;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="stamp mb-2">§ Cart</div>
      <h1 className="display text-5xl leading-none mb-8">The receipt so far</h1>

      {lines.length === 0 ? (
        <div className="ticket rounded-2xl p-10 text-center">
          <div className="display text-3xl">Nothing brewing yet.</div>
          <p className="text-ink-soft mt-2">
            Head back to the catalog and drop something in.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Browse the catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 ">
          <div className="lg:col-span-2 ticket rounded-2xl divide-y divide-ink/10">
            {lines.map((l) => (
              <div
                key={l.productId}
                className="p-5 flex items-center gap-4"
              >
                <div className="flex-1">
                  <div className="stamp">SKU · {l.sku}</div>
                  <Link
                    href={`/products/${encodeURIComponent(l.sku)}`}
                    className="display text-xl hover:text-ember transition-colors"
                  >
                    {l.name}
                  </Link>
                  <div className="mono text-xs text-ink-mute mt-0.5">
                    {formatMoney(l.unitPrice, l.currency)} each
                    {l.type === "recurring" &&
                      ` · billed ${l.billingInterval ?? "recurring"}`}
                  </div>
                </div>

                <div className="flex items-center border border-ink/20 rounded-full bg-cream">
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-ink/5"
                    onClick={() =>
                      updateQuantity(l.productId, l.quantity - 1)
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="mono w-8 text-center tabular-nums">
                    {l.quantity}
                  </span>
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-ink/5"
                    onClick={() =>
                      updateQuantity(l.productId, l.quantity + 1)
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="mono w-24 text-right tabular-nums">
                  {formatMoney(Number(l.unitPrice) * l.quantity, l.currency)}
                </div>
                <button
                  type="button"
                  onClick={() => remove(l.productId)}
                  className="p-2 rounded-full hover:bg-ink/5 text-ink-mute hover:text-ember-deep"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <aside className="ticket rounded-2xl p-6 h-fit">
            <div className="stamp mb-2">Summary</div>
            <dl className="space-y-2 mono text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-mute">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(amount, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-mute">Ships</dt>
                <dd>calculated at fulfillment</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-mute">Tax</dt>
                <dd>included where required</dd>
              </div>
            </dl>
            <div className="border-t border-ink/15 mt-4 pt-4 flex items-baseline justify-between">
              <span className="display text-lg">Total</span>
              <span className="display text-2xl tabular-nums">
                {formatMoney(amount, currency)}
              </span>
            </div>

            {error && (
              <div className="mt-4">
                <Notice title="Couldn't start checkout" tone="error">
                  {error}
                </Notice>
              </div>
            )}

            <button
              type="button"
              className="btn-primary w-full justify-center mt-6"
              disabled={busy}
              onClick={proceed}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {token ? "Proceed to payment" : "Sign in to check out"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
            <p className="text-xs text-ink-mute mt-3">
              Payments powered by Stripe. Retries are idempotent — refresh the
              checkout page and you&apos;ll land on the same PaymentIntent.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
