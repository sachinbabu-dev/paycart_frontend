"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuth, useRecentOrders } from "@/lib/stores";
import { api, ApiError } from "@/lib/api";
import type { Order } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import Notice from "@/components/Notice";
import OrdersLoader from "@/components/OrdersLoader";
import { ShoppingBag } from "lucide-react";

interface Row {
  id: string;
  order?: Order;
  error?: string;
}

export default function OrdersIndex() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const token = useAuth((s) => s.token);
  const recent = useRecentOrders((s) => s.recent);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || recent.length === 0) {
      setRows(recent.map((id) => ({ id })));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const next: Row[] = await Promise.all(
        recent.map(async (id) => {
          try {
            const o = await api.getOrder(id, token);
            return { id, order: o };
          } catch (e) {
            return {
              id,
              error:
                e instanceof ApiError
                  ? `${e.status} · ${e.message}`
                  : e instanceof Error
                    ? e.message
                    : "unknown",
            };
          }
        }),
      );
      if (cancelled) return;
      setRows(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, recent]);

  const showLoader =
    !mounted || (mounted && recent.length > 0 && loading);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="stamp mb-2">§ Orders</div>
      <h1 className="display text-5xl leading-none mb-8">Your ledger</h1>

      {mounted && !token && recent.length > 0 && (
        <Notice title="Not signed in" tone="warn">
          Sign in to load full order details from the backend. We&apos;ll still
          show orders you&apos;ve placed on this device.
        </Notice>
      )}

      <AnimatePresence mode="wait">
        {showLoader ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <OrdersLoader count={mounted ? Math.max(recent.length, 3) : 3} />
          </motion.div>
        ) : recent.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="ticket rounded-2xl p-10 text-center"
          >
            <ShoppingBag className="h-8 w-8 mx-auto text-ink-mute mb-3" />
            <div className="display text-3xl">No orders yet.</div>
            <p className="text-ink-soft mt-2">
              When you place one, it&apos;ll show up here with a live timeline.
            </p>
            <Link href="/" className="btn-primary mt-6 inline-flex">
              Browse the catalog
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="rows"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="ticket rounded-2xl divide-y divide-ink/10"
          >
            {rows.map((row, i) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Link
                  href={`/orders/${row.id}`}
                  className="p-5 flex items-center gap-4 hover:bg-ink/[0.03] transition-colors"
                >
                  <div className="flex-1">
                    <div className="mono text-xs text-ink-mute">
                      Order · {row.id}
                    </div>
                    <div className="display text-xl">
                      #{row.id.slice(0, 8)}
                    </div>
                    {row.order && (
                      <div className="text-xs text-ink-mute mono mt-0.5">
                        placed {formatDate(row.order.createdAt)} ·{" "}
                        {row.order.items.length} line
                        {row.order.items.length === 1 ? "" : "s"}
                      </div>
                    )}
                    {row.error && (
                      <div className="text-xs text-ember-deep mt-0.5">
                        couldn&apos;t fetch: {row.error}
                      </div>
                    )}
                  </div>
                  {row.order && (
                    <div className="text-right">
                      <div className="display text-lg tabular-nums">
                        {formatMoney(
                          row.order.totalAmount,
                          row.order.currency,
                        )}
                      </div>
                      <StatusBadge status={row.order.status} />
                    </div>
                  )}
                  <div className="mono text-xs text-ink-mute">→</div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
