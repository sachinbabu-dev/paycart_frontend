"use client";

import { useCallback, useEffect, useRef, useState, use as usePromise } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, subscriptionStreamUrl } from "@/lib/api";
import { useAuth } from "@/lib/stores";
import { useAuthHydrated } from "@/lib/hooks";
import { formatDate, humanStatus } from "@/lib/format";
import Notice from "@/components/Notice";
import type {
  Subscription,
  SubscriptionStatus,
  SubscriptionStreamMessage,
} from "@/lib/types";
import { ArrowLeft, Loader2, RefreshCw, RotateCw, XCircle } from "lucide-react";

export default function SubscriptionDetailPage(
  props: PageProps<"/account/subscriptions/[id]">,
) {
  const { id } = usePromise(props.params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useAuthHydrated();
  const token = useAuth((s) => s.token);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);

  // Stripe redirects here with ?payment_intent=…&redirect_status=… — surface
  // a friendly banner so the user knows the confirmation went through.
  const redirectStatus = searchParams.get("redirect_status");

  const load = useCallback(async () => {
    // Read the live store value — `token` from the hook can be stale on the
    // first render after hydration.
    const currentToken = useAuth.getState().token;
    if (!currentToken) {
      router.replace(
        `/auth?next=${encodeURIComponent(`/account/subscriptions/${id}`)}`,
      );
      return;
    }
    try {
      const s = await api.getSubscription(id, currentToken);
      setSubscription(s);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(
          `/auth?next=${encodeURIComponent(`/account/subscriptions/${id}`)}`,
        );
        return;
      }
      setError(e instanceof Error ? e.message : "Could not load subscription.");
    }
  }, [id, router]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Subscribe to the live stream. First message is a snapshot (subscription +
  // event history); subsequent `kind: "event"` frames arrive when webhooks
  // fire on the backend. We refetch the subscription on each event because
  // the pushed payload doesn't include the full resulting row — GET is
  // authoritative. Same pattern as the orders page.
  useEffect(() => {
    if (!hydrated) return;
    const currentToken = useAuth.getState().token;
    if (!currentToken) {
      router.replace(
        `/auth?next=${encodeURIComponent(`/account/subscriptions/${id}`)}`,
      );
      return;
    }

    void loadRef.current();

    let cancelled = false;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      if (cancelled) return;
      try {
        const { streamToken } = await api.mintStreamToken(currentToken!);
        if (cancelled) return;
        const source = new EventSource(subscriptionStreamUrl(id, streamToken));
        es = source;

        source.onopen = () => setLive(true);

        source.onmessage = (ev) => {
          let msg: SubscriptionStreamMessage;
          try {
            msg = JSON.parse(ev.data) as SubscriptionStreamMessage;
          } catch {
            return;
          }
          if (msg.kind === "snapshot") {
            setSubscription(msg.subscription);
          } else if (msg.kind === "event") {
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
  }, [hydrated, token, router, id]);
  // `token` stays in deps so a sign-out tears the stream down.

  async function cancel(immediately: boolean) {
    if (!token) return;
    setBusy(true);
    try {
      const updated = await api.cancelSubscription(id, token, { immediately });
      setSubscription(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }

  // "Refresh" just re-reads the local row. "Sync" hits Stripe and applies the
  // fresh state — the escape hatch if a webhook was dropped or delayed.
  async function sync() {
    if (!token) return;
    setBusy(true);
    try {
      const updated = await api.syncSubscription(id, token);
      setSubscription(updated);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated || !token) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-ink-soft">Loading…</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/account/subscriptions"
        className="stamp inline-flex items-center gap-1.5 mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All subscriptions
      </Link>

      <div className="stamp flex items-center gap-3 mb-2">
        <span>§ Subscription</span>
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
      <h1 className="display text-5xl leading-none break-all">
        #{id.slice(0, 8)}
      </h1>

      {redirectStatus === "succeeded" && (
        <div className="mt-6">
          <Notice title="Subscription started" tone="info">
            Stripe confirmed your first payment. Your subscription will renew
            automatically each cycle.
          </Notice>
        </div>
      )}
      {redirectStatus && redirectStatus !== "succeeded" && (
        <div className="mt-6">
          <Notice title={`Payment ${redirectStatus}`} tone="warn">
            Stripe reported <code className="mono">{redirectStatus}</code>. If
            this looks wrong, hit refresh below.
          </Notice>
        </div>
      )}

      {error && (
        <div className="mt-6">
          <Notice title="Something went wrong" tone="error">
            {error}
          </Notice>
        </div>
      )}

      {!subscription && !error ? (
        <div className="mt-8 flex items-center gap-3 text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> loading…
        </div>
      ) : subscription ? (
        <div className="mt-8 ticket rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="display text-3xl">
                {humanStatus(subscription.status)}
              </div>
              <div className="mono text-xs text-ink-mute mt-1">
                {subscription.id}
              </div>
            </div>
            <StatusPill status={subscription.status} />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
            <Row k="Product" v={subscription.productId} />
            <Row
              k="Auto-renew"
              v={subscription.cancelAtPeriodEnd ? "no" : "yes"}
            />
            {subscription.currentPeriodEnd && (
              <Row
                k={
                  subscription.cancelAtPeriodEnd ? "Ends" : "Next cycle"
                }
                v={formatDate(subscription.currentPeriodEnd)}
              />
            )}
            <Row k="Stripe subscription" v={subscription.stripeSubscriptionId} />
            <Row k="Stripe price" v={subscription.stripePriceId} />
            {subscription.latestInvoiceId && (
              <Row k="Latest invoice" v={subscription.latestInvoiceId} />
            )}
            {subscription.lastError && (
              <div className="col-span-2 flex flex-col">
                <dt className="stamp text-ember-deep">Last error</dt>
                <dd className="mono text-xs text-ember-deep">
                  {subscription.lastError}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="btn-ghost text-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void sync()}
              className="btn-ghost text-sm"
              title="Pull the latest state from Stripe (safety net for missed webhooks)"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
              Sync from Stripe
            </button>
            {subscription.status === "incomplete" && (
              <Link
                href={`/subscribe/${subscription.id}`}
                className="btn-primary text-sm"
              >
                Finish setup
              </Link>
            )}
            {canCancel(subscription) && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void cancel(false)}
                  className="btn-ghost text-sm"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Cancel at period end
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void cancel(true)}
                  className="btn-ghost text-sm text-ember-deep"
                >
                  Cancel immediately
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col min-w-0">
      <dt className="stamp">{k}</dt>
      <dd className="mono text-xs truncate">{v}</dd>
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
