"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth, useCart, useRecentOrders } from "@/lib/stores";
import { useAuthHydrated } from "@/lib/hooks";
import {
  getConsent,
  setConsent,
  migrateSessionValuesToCookies,
  deleteCookie,
  type Consent,
} from "@/lib/cookies";
import {
  Cookie,
  LogOut,
  Trash2,
  ShoppingBag,
  Receipt,
  BadgeCheck,
  Coffee,
} from "lucide-react";

const PERSISTED_KEYS = [
  "kaffeine-auth",
  "kaffeine-cart",
  "kaffeine-recent-orders",
];

export default function AccountPage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const token = useAuth((s) => s.token);
  const email = useAuth((s) => s.email);
  const signOut = useAuth((s) => s.clear);

  const cartLines = useCart((s) => s.lines);
  const clearCart = useCart((s) => s.clear);
  const cartCount = cartLines.reduce((n, l) => n + l.quantity, 0);

  const recentOrders = useRecentOrders((s) => s.recent);
  const clearRecent = useRecentOrders((s) => s.clear);

  const [consent, setConsentState] = useState<Consent | null>(null);
  useEffect(() => {
    setConsentState(getConsent());
    const handler = () => setConsentState(getConsent());
    window.addEventListener("kaffeine:consent", handler);
    return () => window.removeEventListener("kaffeine:consent", handler);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!useAuth.getState().token) router.replace("/auth?next=/account");
  }, [hydrated, router]);

  const memberNo = useMemo(() => memberNumberFor(email), [email]);
  const initial = (email?.[0] ?? "·").toUpperCase();

  if (!hydrated || !token) {
    return <div className="mx-auto max-w-3xl px-6 py-24 text-ink-soft">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="stamp mb-2">§ Account</div>
      <h1 className="display text-5xl leading-none mb-8">Your card</h1>

      {/* MEMBERSHIP CARD */}
      <MembershipCard
        initial={initial}
        email={email}
        memberNo={memberNo}
        cartCount={cartCount}
        orderCount={recentOrders.length}
      />

      {/* SETTINGS GRID */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        <PrefCard
          icon={<Cookie className="h-4 w-4" />}
          title="Cookie preferences"
          detail={
            consent === "granted"
              ? "Signed-in state persists across browser sessions."
              : consent === "denied"
                ? "Signed-in state lives only for this tab."
                : "You haven't chosen yet — using this tab only."
          }
          badge={
            consent === "granted"
              ? { text: "granted", tone: "mint" }
              : consent === "denied"
                ? { text: "denied", tone: "ember" }
                : { text: "undecided", tone: "gold" }
          }
        >
          {consent === "granted" ? (
            <button
              type="button"
              onClick={() => {
                setConsent("denied");
                setConsentState("denied");
                for (const k of PERSISTED_KEYS) deleteCookie(k);
              }}
              className="btn-ghost text-sm"
            >
              Revoke consent
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConsent("granted");
                setConsentState("granted");
                migrateSessionValuesToCookies(PERSISTED_KEYS);
              }}
              className="btn-primary text-sm"
            >
              Accept cookies
            </button>
          )}
        </PrefCard>

        <PrefCard
          icon={<Coffee className="h-4 w-4" />}
          title="Currency &amp; locale"
          detail="Prices shown in GBP, converted at a fixed demo rate. Times are en-GB, 24h."
          badge={{ text: "en-GB · GBP", tone: "ink" }}
        >
          <span className="mono text-xs text-ink-mute">
            fx locked at £1 ≈ $1.27 · demo
          </span>
        </PrefCard>

        <PrefCard
          icon={<ShoppingBag className="h-4 w-4" />}
          title="Cart"
          detail={
            cartCount === 0
              ? "Your cart is empty."
              : `${cartCount} item${cartCount === 1 ? "" : "s"} across ${cartLines.length} line${cartLines.length === 1 ? "" : "s"}.`
          }
          badge={{
            text: cartCount === 0 ? "empty" : `${cartCount} in bag`,
            tone: cartCount === 0 ? "mute" : "ember",
          }}
        >
          <div className="flex gap-2">
            <Link href="/cart" className="btn-ghost text-sm">
              View cart
            </Link>
            {cartCount > 0 && (
              <button
                type="button"
                onClick={() => clearCart()}
                className="btn-ghost text-sm"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </PrefCard>

        <PrefCard
          icon={<Receipt className="h-4 w-4" />}
          title="Order history"
          detail={
            recentOrders.length === 0
              ? "No orders tracked on this device yet."
              : `${recentOrders.length} order${recentOrders.length === 1 ? "" : "s"} tracked locally.`
          }
          badge={{
            text: `${recentOrders.length} local`,
            tone: recentOrders.length ? "mint" : "mute",
          }}
        >
          <div className="flex gap-2">
            <Link href="/orders" className="btn-ghost text-sm">
              Open history
            </Link>
            {recentOrders.length > 0 && (
              <button
                type="button"
                onClick={() => clearRecent()}
                className="btn-ghost text-sm"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </PrefCard>
      </div>

      {/* DANGER */}
      <div className="mt-8 ticket rounded-2xl p-6 border-l-4 border-ember">
        <div className="stamp text-ember-deep mb-2">§ Session</div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="display text-2xl">Sign out of this device.</div>
            <p className="text-sm text-ink-soft mt-1">
              Wipes the JWT from the cookie/session and takes you back to the
              catalog.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              signOut();
              router.push("/");
            }}
            className="btn-primary shrink-0"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

interface MembershipCardProps {
  initial: string;
  email: string | null;
  memberNo: string;
  cartCount: number;
  orderCount: number;
}

function MembershipCard({
  initial,
  email,
  memberNo,
  cartCount,
  orderCount,
}: MembershipCardProps) {
  return (
    <section className="relative ticket rounded-3xl overflow-hidden">
      {/* Warm blob backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-ember/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-gold/15 blur-3xl"
      />

      {/* Corner stamp */}
      <div
        aria-hidden
        className="absolute top-6 right-6 rotate-6 border-2 border-ember/60 text-ember-deep px-3 py-1 rounded-md mono text-[10px] uppercase tracking-widest select-none"
      >
        Verified member · No. {memberNo}
      </div>

      {/* Ticker strip across the top edge */}
      <div className="relative bg-ink text-cream mono text-[10px] uppercase tracking-[0.24em] py-1.5 px-6 flex justify-between">
        <span>KAFFEINE · LAB</span>
        <span className="text-ember">◆ ◆ ◆</span>
        <span>MEMBERSHIP CARD</span>
      </div>

      <div className="relative p-8 md:p-10 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 md:gap-10 items-center">
        {/* AVATAR */}
        <div className="relative">
          <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-ink text-cream flex items-center justify-center relative shadow-[0_18px_40px_-14px_rgba(20,16,11,0.5)]">
            <span className="display text-5xl md:text-6xl leading-none">
              {initial}
            </span>
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-mint text-cream border-4 border-cream flex items-center justify-center"
              title="Verified"
            >
              <BadgeCheck className="h-3 w-3" />
            </span>
          </div>
          {/* Decorative bean */}
          <svg
            aria-hidden
            viewBox="0 0 40 24"
            className="absolute -top-4 -left-6 h-6 w-10 text-ember/80"
          >
            <ellipse cx="20" cy="12" rx="18" ry="10" fill="currentColor" />
            <path
              d="M 4 12 Q 20 5 36 12 Q 20 19 4 12"
              stroke="#3a1e10"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>

        {/* DETAILS */}
        <div>
          <div className="stamp">Cardholder</div>
          <div className="display text-3xl md:text-4xl leading-tight mt-1 break-all">
            {email ?? "anonymous drinker"}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 max-w-md">
            <div className="flex flex-col">
              <dt className="stamp">Member no.</dt>
              <dd className="mono">{memberNo}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="stamp">Tier</dt>
              <dd className="mono">Roaster&apos;s Club</dd>
            </div>
            <div className="flex flex-col">
              <dt className="stamp">Orders</dt>
              <dd className="mono">{orderCount.toString().padStart(3, "0")}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="stamp">In bag</dt>
              <dd className="mono">{cartCount.toString().padStart(2, "0")}</dd>
            </div>
          </dl>
        </div>

        {/* SIDE — magstripe-ish barcode */}
        <div className="hidden md:flex flex-col items-end gap-2">
          <div className="stamp">Sig</div>
          <Barcode seed={email ?? "guest"} />
          <div className="mono text-[10px] text-ink-mute">SCAN AT COUNTER</div>
        </div>
      </div>

      {/* PERFORATION EDGE */}
      <div
        aria-hidden
        className="h-2 border-t border-dashed border-ink/25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 8px 4px, var(--color-paper) 4px, transparent 5px)",
          backgroundSize: "16px 8px",
          backgroundRepeat: "repeat-x",
        }}
      />
    </section>
  );
}

interface PrefCardProps {
  icon: React.ReactNode;
  title: string;
  detail: string;
  badge?: { text: string; tone: "mint" | "ember" | "gold" | "ink" | "mute" };
  children?: React.ReactNode;
}

function PrefCard({ icon, title, detail, badge, children }: PrefCardProps) {
  const badgeClass =
    badge?.tone === "mint"
      ? "bg-mint/15 text-mint border-mint/40"
      : badge?.tone === "ember"
        ? "bg-ember/15 text-ember-deep border-ember/40"
        : badge?.tone === "gold"
          ? "bg-gold/20 text-ink border-gold/40"
          : badge?.tone === "ink"
            ? "bg-ink text-cream border-ink"
            : "bg-paper-2 text-ink-mute border-ink/15";

  return (
    <div className="ticket rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink/5 text-ink-soft">
            {icon}
          </span>
          <div>
            <div className="display text-lg leading-tight">{title}</div>
          </div>
        </div>
        {badge && (
          <span
            className={`mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border ${badgeClass}`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-sm text-ink-soft leading-relaxed">{detail}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Barcode({ seed }: { seed: string }) {
  // Deterministic-ish bar widths from a tiny hash.
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  const bars = Array.from({ length: 22 }, (_, i) => {
    const w = 1 + (Math.abs(h >> i) % 3);
    const gap = 1 + (Math.abs(h >> (i + 3)) % 2);
    return { w, gap };
  });
  return (
    <div className="flex items-end gap-[2px] h-10 select-none" aria-hidden>
      {bars.map((b, i) => (
        <span
          key={i}
          className="bg-ink"
          style={{ width: `${b.w}px`, height: `${20 + (i % 3) * 6}px`, marginRight: `${b.gap}px` }}
        />
      ))}
    </div>
  );
}

function memberNumberFor(email: string | null): string {
  if (!email) return "0000-0000";
  let h = 5381;
  for (let i = 0; i < email.length; i++) h = ((h << 5) + h + email.charCodeAt(i)) | 0;
  const n = Math.abs(h).toString().padStart(8, "0").slice(0, 8);
  return `${n.slice(0, 4)}-${n.slice(4)}`;
}
