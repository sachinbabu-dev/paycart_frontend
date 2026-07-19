import type { OrderStatus } from "@/lib/types";
import { humanStatus } from "@/lib/format";

const FLOW: OrderStatus[] = [
  "pending",
  "payment_pending",
  "paid",
  "preparing",
  "shipped",
];

const TERMINAL: OrderStatus[] = ["cancelled", "failed"];

interface Props {
  status: OrderStatus;
}

export default function StatusRing({ status }: Props) {
  const terminated = TERMINAL.includes(status);
  const currentIndex = terminated ? -1 : FLOW.indexOf(status);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {FLOW.map((step, i) => {
        const done = !terminated && i < currentIndex;
        const active = !terminated && i === currentIndex;
        return (
          <div key={step} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-full transition ${
                active
                  ? "bg-ink text-cream"
                  : done
                    ? "bg-mint/20 text-mint"
                    : "bg-paper-2 text-ink-mute"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  active ? "bg-ember ember-dot" : done ? "bg-mint" : "bg-ink-mute/40"
                }`}
              />
              {humanStatus(step)}
            </span>
            {i < FLOW.length - 1 && (
              <span className="h-px w-4 bg-ink/15" aria-hidden />
            )}
          </div>
        );
      })}
      {terminated && (
        <span className="ml-2 mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-ember text-cream">
          · {humanStatus(status)}
        </span>
      )}
    </div>
  );
}
