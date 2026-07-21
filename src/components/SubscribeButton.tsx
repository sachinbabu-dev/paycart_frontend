"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Repeat } from "lucide-react";
import {
  api,
  ApiError,
  pickSubscribeClientSecret,
  pickSubscriptionId,
} from "@/lib/api";
import { useAuth } from "@/lib/stores";
import { useAuthHydrated } from "@/lib/hooks";
import { generateIdempotencyKey } from "@/lib/format";
import type { Product, Subscription } from "@/lib/types";
import Notice from "./Notice";

interface Props {
  product: Product;
}

// Statuses where an existing subscription blocks starting a new one. If the
// user's subscription is in any of these, we route them to the appropriate
// page instead of creating a duplicate. `canceled`, `incomplete_expired`,
// and `unpaid` fall through so the user can start fresh.
const BLOCKING_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "paused",
  "incomplete",
]);

export default function SubscribeButton({ product }: Props) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const token = useAuth((s) => s.token);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    if (!hydrated) return;
    if (!token) {
      router.push(
        `/auth?next=${encodeURIComponent(`/products/${product.sku}`)}`,
      );
      return;
    }
    setBusy(true);
    setError(null);

    try {
      // Check for an existing subscription for this SKU before creating one.
      // The backend's idempotent-replay would otherwise hand back the
      // original response — including a client_secret whose PaymentIntent is
      // already in a terminal state, which Stripe.js refuses to mount.
      const existing = await api.listSubscriptions(token);
      const match = pickBlockingSubscription(existing, product.sku);
      if (match) {
        routeToExisting(router, match);
        return;
      }

      // Fresh key on every click. Reusing a per-SKU key across the lifetime
      // of the session was the bug: on the second click Stripe would return
      // the original (now-succeeded) PaymentIntent, and the subscribe page
      // choked with "PaymentIntent is in a terminal state".
      const idemKey = generateIdempotencyKey();
      const res = await api.subscribe(product.sku, idemKey, token);
      const secret = pickSubscribeClientSecret(res);
      const subId = pickSubscriptionId(res);
      if (!secret || !subId) {
        throw new Error(
          "Subscribe succeeded but the API did not return a client_secret and subscription id.",
        );
      }
      // Hand the client_secret to the confirmation page via sessionStorage
      // so it doesn't end up in the URL (and thus in logs / history).
      sessionStorage.setItem(`sub-secret:${subId}`, secret);
      router.push(`/subscribe/${subId}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(
          `/auth?next=${encodeURIComponent(`/products/${product.sku}`)}`,
        );
        return;
      }
      setError(
        e instanceof Error ? e.message : "Could not start subscription.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={busy || !product.active}
        className="btn-primary justify-center"
        onClick={() => void subscribe()}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Repeat className="h-4 w-4" />
        )}
        {busy
          ? "Checking your subscriptions…"
          : `Subscribe · per ${product.billingInterval ?? "cycle"}`}
      </button>
      {error && (
        <Notice title="Couldn't start subscription" tone="error">
          {error}
        </Notice>
      )}
    </div>
  );
}

function pickBlockingSubscription(
  subs: Subscription[],
  sku: string,
): Subscription | null {
  // `productId` on the entity is actually the SKU (confirmed against the
  // live API). Also match on stripePriceId as a fallback in case the
  // backend ever switches representations.
  const forSku = subs.filter(
    (s) => s.productId === sku && BLOCKING_STATUSES.has(s.status),
  );
  if (forSku.length === 0) return null;
  // Prefer `incomplete` (needs finishing) over `active` (already done) so
  // the user lands on the payment page first if there's setup pending.
  return (
    forSku.find((s) => s.status === "incomplete") ??
    forSku[0]
  );
}

function routeToExisting(
  router: ReturnType<typeof useRouter>,
  sub: Subscription,
) {
  if (sub.status === "incomplete") {
    // Only route to the payment page if we have the stashed client_secret
    // from a previous session; otherwise the user has to cancel-and-retry
    // (the backend doesn't hand out a fresh secret for existing rows).
    const stashed = sessionStorage.getItem(`sub-secret:${sub.id}`);
    if (stashed) {
      router.push(`/subscribe/${sub.id}`);
      return;
    }
  }
  router.push(`/account/subscriptions/${sub.id}`);
}
