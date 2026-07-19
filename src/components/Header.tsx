"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useCart } from "@/lib/stores";
import { useAuthHydrated } from "@/lib/hooks";
import { ShoppingBag, User } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const token = useAuth((s) => s.token);
  const email = useAuth((s) => s.email);
  const cartCount = useCart((s) =>
    s.lines.reduce((n, l) => n + l.quantity, 0),
  );

  const nav = [
    { href: "/", label: "Shop" },
    { href: "/orders", label: "Orders" },
  ];

  const initial = initialFrom(email);
  const onAccountPage = pathname.startsWith("/account");

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/85 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink text-cream">
            <span className="display text-xl leading-none">K</span>
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ember" />
          </span>
          <span className="display text-2xl leading-none tracking-tight">
            Kaffeine<span className="text-ember">.</span>Lab
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  active
                    ? "bg-ink text-cream"
                    : "text-ink-soft hover:text-ink hover:bg-ink/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {hydrated && token ? (
            <Link
              href="/account"
              aria-label="Account"
              title={email ?? "Account"}
              className={`group relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                onAccountPage
                  ? "bg-ink text-cream ring-2 ring-ember ring-offset-2 ring-offset-paper"
                  : "bg-ink text-cream hover:bg-ember hover:-translate-y-0.5"
              }`}
            >
              {/* Concentric ring hint on hover */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full border border-ember/50 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-300"
              />
              <span className="display text-base leading-none">{initial}</span>
              {/* Live-session dot (mint) sits over the ring, signals "signed in" */}
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-mint border-2 border-paper"
              />
            </Link>
          ) : (
            <Link href="/auth" className="btn-ghost text-sm">
              <User className="h-4 w-4" /> Sign in
            </Link>
          )}

          <Link
            href="/cart"
            className="relative btn-primary text-sm"
            aria-label="Cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Cart</span>
            {hydrated && cartCount > 0 && (
              <span className="ml-1 mono text-xs bg-ember text-cream rounded-full h-5 min-w-5 px-1.5 inline-flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

function initialFrom(email: string | null): string {
  if (!email) return "·";
  const trimmed = email.trim();
  if (!trimmed) return "·";
  return trimmed[0].toUpperCase();
}
