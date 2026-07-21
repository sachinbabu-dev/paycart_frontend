"use client";

import { useEffect, useMemo, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { api, ApiError, subscriptionStreamUrl } from "@/lib/api";
import { useAuth } from "@/lib/stores";
import { useAuthHydrated } from "@/lib/hooks";
import { formatDate, humanStatus } from "@/lib/format";
import SubscribeForm from "@/components/SubscribeForm";
import Notice from "@/components/Notice";
import type { Subscription, SubscriptionStreamMessage } from "@/lib/types";
import { ArrowLeft, Loader2, Repeat } from "lucide-react";

// Once the initial invoice is paid, Stripe pushes a webhook that transitions
// the row out of `incomplete`. When we see any of these, the user has already
// paid — bounce them to the detail page instead of leaving them on the
// payment form.
const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export default function SubscribePage(props: PageProps<"/subscribe/[id]">) {
  const { id } = usePromise(props.params);
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const hydrated = useAuthHydrated();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeMissing, setStripeMissing] = useState(false);
  const [needsRestart, setNeedsRestart] = useState(false);
  const [live, setLive] = useState(false);

  // Read the stashed client_secret. Kept in its own effect so remounts from
  // the SSE effect below don't retrigger the sessionStorage check.
  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push(`/auth?next=${encodeURIComponent(`/subscribe/${id}`)}`);
      return;
    }
    let cancelled = false;
    // Defer the setState off the effect body — the lint rule flags a
    // synchronous transition even for a one-shot sessionStorage read.
    (async () => {
      // SubscribeButton stashed the client_secret before navigating; the
      // backend can't hand it back later. If it isn't in this tab, the user
      // deep-linked or refreshed after the session died.
      const secret = sessionStorage.getItem(`sub-secret:${id}`);
      if (cancelled) return;
      if (!secret) setNeedsRestart(true);
      else setClientSecret(secret);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, id, token, router]);

  // Live subscription stream. The first frame is a snapshot (full row +
  // event history); subsequent `event` frames arrive whenever Stripe
  // webhooks fire. We reconcile via GET on each event because the pushed
  // payload doesn't include the resulting row. If the status transitions
  // out of `incomplete` while the user is on this page, we redirect to
  // the detail page — payment already went through.
  useEffect(() => {
    if (!hydrated) return;
    const currentToken = useAuth.getState().token;
    if (!currentToken) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function applySubscription(sub: Subscription) {
      if (cancelled) return;
      setSubscription(sub);
      if (PAID_STATUSES.has(sub.status) || sub.status === "canceled") {
        router.replace(`/account/subscriptions/${id}`);
      }
    }

    async function refetch() {
      if (cancelled) return;
      try {
        const sub = await api.getSubscription(id, currentToken!);
        applySubscription(sub);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.push(`/auth?next=${encodeURIComponent(`/subscribe/${id}`)}`);
          return;
        }
        setError(
          e instanceof Error ? e.message : "Could not load subscription.",
        );
      }
    }

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
            applySubscription(msg.subscription);
          } else if (msg.kind === "event") {
            void refetch();
          }
        };

        source.onerror = () => {
          setLive(false);
          source.close();
          es = null;
          if (!cancelled) reconnectTimer = setTimeout(connect, 3000);
        };
      } catch (e) {
        setLive(false);
        if (e instanceof ApiError && e.status === 401) {
          router.push(`/auth?next=${encodeURIComponent(`/subscribe/${id}`)}`);
          return;
        }
        // Fall back to a plain GET so we at least render something, and
        // schedule a reconnect for the stream.
        void refetch();
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

  const stripePromise = useMemo(() => {
    const p = getStripe();
    p.then((s) => {
      if (!s) setStripeMissing(true);
    });
    return p;
  }, []);

  // Memoize the Elements options so the Stripe provider doesn't re-init and
  // remount its children when the parent re-renders (which would produce
  // "elements should have a mounted Payment Element" on the next confirm).
  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            locale: "en-GB" as const,
            appearance: {
              theme: "flat" as const,
              variables: {
                colorPrimary: "#d94822",
                colorBackground: "#fff9ec",
                colorText: "#14100b",
                fontFamily: "Inter, system-ui, sans-serif",
                borderRadius: "8px",
              },
            },
          }
        : null,
    [clientSecret],
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/"
        className="stamp inline-flex items-center gap-1.5 mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the catalog
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
      <h1 className="display text-5xl leading-none">
        Confirm <span className="text-ember">#{id.slice(0, 8)}</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
        <div className="lg:col-span-3 ticket rounded-2xl p-6">
          {error && (
            <Notice title="Subscription failed" tone="error">
              {error}
            </Notice>
          )}

          {needsRestart && (
            <Notice title="Session expired" tone="warn">
              We don&apos;t have the payment context for this subscription in
              this tab anymore. Head back to the product and hit{" "}
              <em>Subscribe</em> again — Stripe will pick up right where you
              left off.
            </Notice>
          )}

          {stripeMissing && (
            <Notice title="Stripe publishable key missing" tone="warn">
              Add{" "}
              <code className="mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
              to <code className="mono">.env.local</code> and restart.
            </Notice>
          )}

          {!error && !needsRestart && !clientSecret && !stripeMissing && (
            <div className="flex items-center gap-3 text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              Contacting Stripe — mounting subscription payment…
            </div>
          )}

          {elementsOptions && !stripeMissing && (
            <Elements stripe={stripePromise} options={elementsOptions}>
              <SubscribeForm subscriptionId={id} />
            </Elements>
          )}

          {clientSecret && (
            <div className="mt-6 text-xs text-ink-mute mono">
              client_secret · {clientSecret.slice(0, 32)}…
            </div>
          )}
        </div>

        <aside className="lg:col-span-2 ticket rounded-2xl p-6 h-fit">
          <div className="stamp mb-2">Ticket</div>
          {!subscription ? (
            <div className="text-ink-soft">
              <Loader2 className="inline h-4 w-4 animate-spin" /> loading
              subscription
            </div>
          ) : (
            <>
              <div className="mono text-xs text-ink-mute">
                Subscription ·{" "}
                <span className="text-ink">{subscription.id}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex flex-col">
                  <dt className="stamp">Status</dt>
                  <dd className="mono text-sm">
                    {humanStatus(subscription.status)}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="stamp">Auto-renew</dt>
                  <dd className="mono text-sm">
                    {subscription.cancelAtPeriodEnd ? "no" : "yes"}
                  </dd>
                </div>
                {subscription.currentPeriodEnd && (
                  <div className="col-span-2 flex flex-col">
                    <dt className="stamp">Next cycle</dt>
                    <dd className="mono text-sm">
                      {formatDate(subscription.currentPeriodEnd)}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-6 flex items-center gap-2 text-ink-soft text-sm">
                <Repeat className="h-3.5 w-3.5" />
                Charged automatically each cycle.
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
