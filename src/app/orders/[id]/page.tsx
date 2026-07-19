"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  use as usePromise,
  useCallback,
  useRef,
} from "react";
import { api, ApiError, orderStreamUrl } from "@/lib/api";
import { useAuth, useRecentOrders } from "@/lib/stores";
import { useAuthHydrated } from "@/lib/hooks";
import type { Order, StreamMessage } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import BrewJourney from "@/components/BrewJourney";
import StatusBadge from "@/components/StatusBadge";
import Notice from "@/components/Notice";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function OrderPage(props: PageProps<"/orders/[id]">) {
  const { id } = usePromise(props.params);
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const hydrated = useAuthHydrated();
  const pushOrder = useRecentOrders((s) => s.push);

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    // Read the live store value — the `token` we get from `useAuth((s) => s.token)`
    // can be stale on the first render after hydration if React hasn't committed
    // the token update to this component yet.
    const currentToken = useAuth.getState().token;
    if (!currentToken) {
      router.push(`/auth?next=${encodeURIComponent(`/orders/${id}`)}`);
      return;
    }
    try {
      const o = await api.getOrder(id, currentToken);
      setOrder(o);
      pushOrder(o.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/auth?next=${encodeURIComponent(`/orders/${id}`)}`);
        return;
      }
      setError(e instanceof Error ? e.message : "Could not load the order.");
    }
  }, [id, router, pushOrder]);

  // Latest load fn without re-triggering the SSE effect on every render.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Subscribe to the live stream. First message is a snapshot (order + full
  // event history), then `kind: "event"` frames arrive as new state
  // transitions fire on the backend. We refetch on each pushed event because
  // the wire format for pushed events doesn't include the resulting
  // fromStatus/toStatus fields — the /orders/:id endpoint is authoritative.
  useEffect(() => {
    if (!hydrated) return;
    // Same story as `load`: read live token, not the potentially-stale hook
    // closure. The React commit for the token update and the one for the
    // hydration flag flipping can land in different render passes, and the
    // effect might fire once with hydrated=true, token=null even though the
    // store already has the real token.
    const currentToken = useAuth.getState().token;
    if (!currentToken) {
      router.push(`/auth?next=${encodeURIComponent(`/orders/${id}`)}`);
      return;
    }

    // Eager one-shot fetch so the page fills even if the stream is slow.
    void loadRef.current();

    let cancelled = false;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      if (cancelled) return;
      try {
        // `currentToken` was null-checked above; it can't have flipped since it's a const.
        const { streamToken } = await api.mintStreamToken(currentToken!);
        if (cancelled) return;
        const source = new EventSource(orderStreamUrl(id, streamToken));
        es = source;

        source.onopen = () => setLive(true);

        source.onmessage = (ev) => {
          let msg: StreamMessage;
          try {
            msg = JSON.parse(ev.data) as StreamMessage;
          } catch {
            return;
          }
          if (msg.kind === "snapshot") {
            setOrder(msg.order);
            pushOrder(msg.order.id);
          } else if (msg.kind === "event") {
            // Refetch the order for the authoritative status after each push.
            void loadRef.current();
          }
        };

        source.onerror = () => {
          setLive(false);
          source.close();
          es = null;
          if (!cancelled) reconnectTimer = setTimeout(connect, 3000);
        };
      } catch {
        setLive(false);
        if (!cancelled) reconnectTimer = setTimeout(connect, 3000);
      }
    }

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
      setLive(false);
    };
  }, [hydrated, id, token, router, pushOrder]);
  // ^ `token` stays in the dep list so a sign-out (token → null) tears the
  // stream down and re-runs the redirect check.

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Notice title="Could not load this order" tone="error">
          {error}
        </Notice>
        <Link href="/" className="stamp inline-flex items-center gap-1.5 mt-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the catalog
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-ink-soft">
        Loading order...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/orders"
        className="stamp inline-flex items-center gap-1.5 mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All orders
      </Link>

      <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div>
          <div className="stamp flex items-center gap-3">
            <span>§ Order</span>
            <span
              className={`inline-flex items-center gap-1 mono ${
                live ? "text-mint" : "text-ink-mute"
              }`}
              title={live ? "Live stream connected" : "Stream reconnecting"}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  live ? "bg-mint ember-dot" : "bg-ink-mute/40"
                }`}
              />
              {live ? "LIVE" : "reconnecting"}
            </span>
          </div>
          <h1 className="display text-5xl leading-none">
            #{order.id.slice(0, 8)}
          </h1>
          <div className="mono text-xs text-ink-mute mt-2">
            placed {formatDate(order.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <button
            type="button"
            onClick={() => void load()}
            className="btn-ghost text-sm"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-10">
        <div className="lg:col-span-3">
          <BrewJourney currentStatus={order.status} />
        </div>

        <aside className="lg:col-span-2 ticket rounded-2xl p-6 h-fit">
          <div className="stamp mb-2">Line items</div>
          <div className="divide-y divide-ink/10">
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

          {order.status === "pending" && (
            <Link
              href={`/checkout/${order.id}`}
              className="btn-primary w-full justify-center mt-6"
            >
              Complete payment →
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
