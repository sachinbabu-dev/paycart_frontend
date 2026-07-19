# Kaffeine Lab

A specialty-coffee storefront built on the **Payment Backend** API
(`https://paycartbackend-production.up.railway.app`). Editorial magazine
layout, ember/paper palette, ticket-styled receipts, and a live "brew
timeline" that visualizes the append-only order event stream.

## Stack

- Next.js 16 (App Router, Turbopack, React 19.2)
- TypeScript
- Tailwind CSS v4 (CSS-first `@theme`)
- Zustand + localStorage (auth JWT + cart + recent orders)
- Stripe.js `<PaymentElement>` for the payment step
- Framer Motion for the event ticker animations
- lucide-react icons, Fraunces + Inter + JetBrains Mono via `next/font`

## Getting started

Requires Node 20.9+ (Next 16 minimum). Node 22 is what I used.

```bash
npm install
cp .env.example .env.local     # fill in your Stripe publishable key
npm run dev                    # http://localhost:3000
```

### Environment variables

| Var | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | Loads Stripe.js so the PaymentElement can mount. Without it, the checkout page shows a warning but every other flow still works. |
| `PAYCART_API_URL` | server | Overrides the upstream API host. Defaults to `https://paycartbackend-production.up.railway.app`. |

## Architecture notes

**Server-side vs. client-side calls.** `src/lib/api.ts` picks a base URL
at runtime: server components hit the upstream directly (so SSR works
under `npm run build`), and browser calls flow through
`/api/paycart/*` — a passthrough route handler at
`src/app/api/paycart/[...path]/route.ts` that removes any CORS risk and
keeps the upstream host out of client bundles.

**Idempotent checkout.** `POST /orders/:id/checkout` requires an
`Idempotency-Key` header. `src/app/checkout/[id]/page.tsx` stashes a
per-order UUID in `sessionStorage` the first time; refreshing the page
reuses the same key so the backend returns the same PaymentIntent
`client_secret` instead of creating a duplicate.

**Money.** The API returns integer strings in the smallest currency
unit (`"1499"` = $14.99). `formatMoney()` divides by 100 before
formatting.

**Product identifier.** `CreateOrderItemDto.productId` is documented as
the SKU (not the UUID `id`), so the cart stores SKU and passes it
through unchanged. Inventory records are looked up by both `id` and
`sku` for safety.

**Order timeline.** `/orders/[id]` polls
`GET /orders/:id/events` every 6 seconds until the order hits a
terminal state (`shipped`, `cancelled`, `failed`). New rows animate in
via `<AnimatePresence>`.

## Routes

| Path | What it does |
| --- | --- |
| `/` | Hero + magazine-grid catalog (SSR, fetches `/products` + `/inventory`) |
| `/products/[sku]` | Product detail with stock pill + add-to-cart |
| `/cart` | Cart lines from `localStorage`, kicks off `POST /orders` |
| `/auth` | Unified sign-in/sign-up form |
| `/checkout/[id]` | Creates the PaymentIntent, mounts Stripe Elements |
| `/orders` | Locally-tracked list of your recent orders |
| `/orders/[id]` | Order detail + live brew timeline |
| `/about` | Colophon explaining the design and the API surface it touches |
| `/api/paycart/*` | Server-side proxy to the upstream backend |

## Available scripts

- `npm run dev` — Next dev with Turbopack
- `npm run build` — production build (Turbopack)
- `npm run start` — serve the production build
