import type { OrderStatus } from "@/lib/types";
import { humanStatus } from "@/lib/format";

const styles: Record<OrderStatus, string> = {
  pending: "bg-ink-mute/15 text-ink-soft",
  payment_pending: "bg-gold/20 text-ink border border-gold/40",
  paid: "bg-mint/20 text-mint border border-mint/40",
  preparing: "bg-ember/15 text-ember-deep border border-ember/40",
  shipped: "bg-ink text-cream",
  cancelled: "bg-ink/10 text-ink-mute line-through",
  failed: "bg-ember/25 text-ember-deep border border-ember",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mono text-[11px] uppercase tracking-wider ${styles[status]}`}
    >
      {status === "preparing" && (
        <span className="h-1.5 w-1.5 rounded-full bg-ember ember-dot" />
      )}
      {humanStatus(status)}
    </span>
  );
}
