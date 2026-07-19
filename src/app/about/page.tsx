import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="stamp">§ Colophon</div>
      <h1 className="display text-5xl md:text-6xl leading-[0.95] mt-2">
        The Lab
      </h1>
      <p className="mt-6 text-lg text-ink-soft leading-relaxed">
        Kaffeine Lab is a demo storefront built directly on top of the
        Payment Backend — a modular NestJS monolith with Stripe PaymentIntents,
        a transactional outbox, and an event-driven inventory system.
      </p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="ticket rounded-2xl p-6">
          <div className="stamp">§ Endpoints in play</div>
          <ul className="mt-3 text-sm mono space-y-1.5">
            <li>POST /auth/signup · /auth/login</li>
            <li>GET /products · /products/:sku</li>
            <li>GET /inventory · /inventory/:productId</li>
            <li>POST /orders</li>
            <li>GET /orders/:id · /orders/:id/events</li>
            <li>POST /orders/:id/checkout (idempotent)</li>
          </ul>
        </section>
        <section className="ticket rounded-2xl p-6">
          <div className="stamp">§ How the timeline works</div>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Every state change on an order is a row in an append-only event
            log. The order page polls{" "}
            <code className="mono text-xs">GET /orders/:id/events</code> every
            6 seconds until it hits a terminal state (shipped, cancelled,
            failed) and renders each row as it arrives.
          </p>
        </section>
        <section className="ticket rounded-2xl p-6">
          <div className="stamp">§ Idempotency</div>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Checkout stashes a UUID as{" "}
            <code className="mono text-xs">Idempotency-Key</code> in{" "}
            <code className="mono text-xs">sessionStorage</code> the first
            time. Refreshing the payment page reuses the same key, so the
            backend hands back the exact same PaymentIntent instead of
            creating a duplicate.
          </p>
        </section>
        <section className="ticket rounded-2xl p-6">
          <div className="stamp">§ Design notes</div>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Editorial/roast-journal aesthetic: Fraunces display serif with
            SOFT/WONK axes, JetBrains Mono for meta, an ember accent that
            picks up state changes, and ticket-styled surfaces reminiscent of
            till receipts.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/" className="btn-primary">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
