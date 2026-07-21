"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/stores";
import { useAuthHydrated } from "@/lib/hooks";
import { formatDate, humanStatus } from "@/lib/format";
import type { Subscription, SubscriptionStatus } from "@/lib/types";
import Notice from "@/components/Notice";
import {
  ArrowLeft,
  Loader2,
  Repeat,
  RefreshCw,
  XCircle,
} from "lucide-react";

export default function SubscriptionsPage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const token = useAuth((s) => s.token);

  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/auth?next=/account/subscriptions");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listSubscriptions(token);
        if (cancelled) return;
        setSubs(list);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.push("/auth?next=/account/subscriptions");
          return;
        }
        setError(
          e instanceof Error ? e.message : "Could not load subscriptions.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, token, router, refreshNonce]);

  // Refresh whenever the tab regains focus. Throttled so alt-tab-mashing
  // doesn't hammer the endpoint, and skipped while hidden so we don't ping
  // the API from a backgrounded tab.
  useEffect(() => {
    if (!hydrated || !token) return;
    let lastRefresh = Date.now();
    const MIN_INTERVAL_MS = 5000;
    function maybeRefresh() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefresh < MIN_INTERVAL_MS) return;
      lastRefresh = now;
      setRefreshNonce((n) => n + 1);
    }
    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, [hydrated, token]);

  async function cancel(id: string, immediately: boolean) {
    if (!token) return;
    setPendingCancel(id);
    try {
      const updated = await api.cancelSubscription(id, token, { immediately });
      setSubs((prev) =>
        (prev ?? []).map((s) => (s.id === id ? updated : s)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed.");
    } finally {
      setPendingCancel(null);
    }
  }

  if (!hydrated || !token) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-ink-soft">Loading…</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/account"
        className="stamp inline-flex items-center gap-1.5 mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to your card
      </Link>
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="stamp mb-2">§ Subscriptions</div>
          <h1 className="display text-5xl leading-none">Standing orders</h1>
        </div>
        <button
          type="button"
          onClick={() => setRefreshNonce((n) => n + 1)}
          className="btn-ghost text-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <Notice title="Something went wrong" tone="error">
          {error}
        </Notice>
      )}

      {subs === null && !error ? (
        <div className="flex items-center gap-3 text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> loading your
          subscriptions…
        </div>
      ) : subs && subs.length === 0 ? (
        <div className="ticket rounded-2xl p-8 text-center">
          <Repeat className="h-6 w-6 mx-auto mb-3 text-ink-mute" />
          <div className="display text-2xl mb-1">No standing orders yet.</div>
          <p className="text-ink-soft mb-4">
            Pick a recurring product to have it show up here.
          </p>
          <Link href="/" className="btn-primary">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {(subs ?? []).map((s) => (
            <li key={s.id} className="ticket rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mono text-xs text-ink-mute truncate">
                    {s.id}
                  </div>
                  <div className="display text-2xl mt-1">
                    {humanStatus(s.status)}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 max-w-md">
                    <div className="flex flex-col">
                      <dt className="stamp">Product</dt>
                      <dd className="mono text-xs truncate">{s.productId}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="stamp">Auto-renew</dt>
                      <dd className="mono text-xs">
                        {s.cancelAtPeriodEnd ? "no" : "yes"}
                      </dd>
                    </div>
                    {s.currentPeriodEnd && (
                      <div className="col-span-2 flex flex-col">
                        <dt className="stamp">
                          {s.cancelAtPeriodEnd ? "Ends" : "Next cycle"}
                        </dt>
                        <dd className="mono text-xs">
                          {formatDate(s.currentPeriodEnd)}
                        </dd>
                      </div>
                    )}
                    {s.lastError && (
                      <div className="col-span-2 flex flex-col">
                        <dt className="stamp text-ember-deep">Last error</dt>
                        <dd className="mono text-xs text-ember-deep">
                          {s.lastError}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
                <StatusPill status={s.status} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {s.status === "incomplete" && (
                  <Link
                    href={`/subscribe/${s.id}`}
                    className="btn-primary text-sm"
                  >
                    Finish setup
                  </Link>
                )}
                {canCancel(s) && (
                  <>
                    <button
                      type="button"
                      disabled={pendingCancel === s.id}
                      onClick={() => void cancel(s.id, false)}
                      className="btn-ghost text-sm"
                    >
                      {pendingCancel === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Cancel at period end
                    </button>
                    <button
                      type="button"
                      disabled={pendingCancel === s.id}
                      onClick={() => void cancel(s.id, true)}
                      className="btn-ghost text-sm text-ember-deep"
                    >
                      Cancel immediately
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function canCancel(s: Subscription): boolean {
  if (s.cancelAtPeriodEnd) return false;
  return (
    s.status === "active" ||
    s.status === "trialing" ||
    s.status === "past_due" ||
    s.status === "paused" ||
    s.status === "unpaid"
  );
}

const toneFor: Record<SubscriptionStatus, string> = {
  incomplete: "bg-gold/20 text-ink border border-gold/40",
  incomplete_expired: "bg-ink/10 text-ink-mute line-through",
  active: "bg-mint/20 text-mint border border-mint/40",
  trialing: "bg-mint/15 text-mint border border-mint/40",
  past_due: "bg-ember/15 text-ember-deep border border-ember/40",
  canceled: "bg-ink/10 text-ink-mute line-through",
  unpaid: "bg-ember/25 text-ember-deep border border-ember",
  paused: "bg-ink-mute/15 text-ink-soft",
};

function StatusPill({ status }: { status: SubscriptionStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mono text-[11px] uppercase tracking-wider ${toneFor[status]}`}
    >
      {humanStatus(status)}
    </span>
  );
}
