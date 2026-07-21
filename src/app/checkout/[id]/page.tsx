"use client";

import { useEffect, useMemo, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { api, ApiError, pickClientSecret } from "@/lib/api";
import { useAuth, useCart } from "@/lib/stores";
import { useAuthHydrated } from "@/lib/hooks";
import { formatMoney, generateIdempotencyKey } from "@/lib/format";
import CheckoutForm from "@/components/CheckoutForm";
import Notice from "@/components/Notice";
import type { Order } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function CheckoutPage(props: PageProps<"/checkout/[id]">) {
  const { id } = usePromise(props.params);
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const hydrated = useAuthHydrated();
  const clearCart = useCart((s) => s.clear);

  const [order, setOrder] = useState<Order | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeMissing, setStripeMissing] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push(
        `/auth?next=${encodeURIComponent(`/checkout/${id}`)}`,
      );
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [o, secret] = await Promise.all([
          api.getOrder(id, token),
          startCheckout(id, token),
        ]);
        if (cancelled) return;
        setOrder(o);
        setClientSecret(secret);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.push(
            `/auth?next=${encodeURIComponent(`/checkout/${id}`)}`,
          );
          return;
        }
        setError(
          e instanceof Error ? e.message : "Could not start checkout.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, id, token, router]);

  useEffect(() => {
    // Clear the cart once we're safely in the checkout flow.
    if (clientSecret) clearCart();
  }, [clientSecret, clearCart]);

  const stripePromise = useMemo(() => {
    const p = getStripe();
    p.then((s) => {
      if (!s) setStripeMissing(true);
    });
    return p;
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="stamp mb-2">§ Payment</div>
      <h1 className="display text-5xl leading-none">
        Order <span className="text-ember">#{id.slice(0, 8)}</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
        <div className="lg:col-span-3 ticket rounded-2xl p-6">
          {error && (
            <Notice title="Checkout failed" tone="error">
              {error}
            </Notice>
          )}

          {stripeMissing && (
            <Notice title="Stripe publishable key missing" tone="warn">
              Add{" "}
              <code className="mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
              to <code className="mono">.env.local</code> and restart. The
              order and client-secret call already succeeded — Stripe.js just
              can&apos;t mount without a public key.
            </Notice>
          )}

          {!error && !clientSecret && !stripeMissing && (
            <div className="flex items-center gap-3 text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              Contacting Stripe — creating PaymentIntent...
            </div>
          )}

          {clientSecret && !stripeMissing && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                locale: "en-GB",
                appearance: {
                  theme: "flat",
                  variables: {
                    colorPrimary: "#d94822",
                    colorBackground: "#fff9ec",
                    colorText: "#14100b",
                    fontFamily: "Inter, system-ui, sans-serif",
                    borderRadius: "8px",
                  },
                },
              }}
            >
              <CheckoutForm orderId={id} />
            </Elements>
          )}

          {clientSecret && (
            <div className="mt-6 text-xs text-ink-mute mono">
              client_secret · {clientSecret.slice(0, 32)}...
            </div>
          )}
        </div>

        <aside className="lg:col-span-2 ticket rounded-2xl p-6 h-fit">
          <div className="stamp mb-2">Ticket</div>
          {!order ? (
            <div className="text-ink-soft">
              <Loader2 className="inline h-4 w-4 animate-spin" /> loading order
            </div>
          ) : (
            <>
              <div className="mono text-xs text-ink-mute">
                Order · <span className="text-ink">{order.id}</span>
              </div>
              <div className="mt-4 divide-y divide-ink/10">
                {order.items.map((it) => (
                  <div key={it.id} className="py-2 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="mono text-xs text-ink-mute">
                        SKU · {it.productId}
                      </div>
                      <div className="text-sm">
                        {it.quantity} ×{" "}
                        {formatMoney(it.unitPrice, order.currency)}
                      </div>
                    </div>
                    <div className="mono tabular-nums text-sm">
                      {formatMoney(
                        Number(it.unitPrice) * it.quantity,
                        order.currency,
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-ink/15 mt-4 pt-4 flex items-baseline justify-between">
                <span className="display text-lg">Total</span>
                <span className="display text-2xl tabular-nums">
                  {formatMoney(order.totalAmount, order.currency)}
                </span>
              </div>
              <div className="mt-4">
                <Link
                  href={`/orders/${order.id}`}
                  className="btn-ghost w-full justify-center text-sm"
                >
                  View live timeline →
                </Link>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

async function startCheckout(orderId: string, token: string): Promise<string> {
  // Reuse a per-order idempotency key so refreshing this page returns the
  // same PaymentIntent from the backend instead of creating a new one. If
  // Stripe rejects the key as reused-with-different-params (e.g. left over
  // from the older double-header bug), drop it and retry once with a fresh
  // key.
  const storageKey = `idem:${orderId}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const stored = sessionStorage.getItem(storageKey);
    const key = stored ?? generateIdempotencyKey();
    if (!stored) sessionStorage.setItem(storageKey, key);
    try {
      const res = await api.checkout(orderId, key, token);
      const secret = pickClientSecret(res);
      if (!secret) {
        throw new Error(
          "Checkout succeeded but no client_secret was returned by the API.",
        );
      }
      return secret;
    } catch (e) {
      if (attempt === 0 && isIdempotencyMismatch(e)) {
        sessionStorage.removeItem(storageKey);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Could not start checkout.");
}

function isIdempotencyMismatch(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  const msg = e.message?.toLowerCase() ?? "";
  return (
    msg.includes("idempotent") &&
    (msg.includes("same parameters") || msg.includes("different parameters"))
  );
}
