"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { OrderStatus } from "@/lib/types";
import { humanStatus } from "@/lib/format";
import {
  Receipt,
  CreditCard,
  BadgeCheck,
  Coffee,
  Truck,
  Check,
  AlertOctagon,
} from "lucide-react";

interface Stage {
  status: OrderStatus;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const STAGES: Stage[] = [
  {
    status: "pending",
    label: "Ticket printed",
    hint: "Order written to the ledger.",
    Icon: Receipt,
  },
  {
    status: "payment_pending",
    label: "Card authorized",
    hint: "Stripe PaymentIntent is live.",
    Icon: CreditCard,
  },
  {
    status: "paid",
    label: "Paid in full",
    hint: "Charge confirmed by webhook.",
    Icon: BadgeCheck,
  },
  {
    status: "preparing",
    label: "Roasting & packing",
    hint: "Batch pulled from the drum.",
    Icon: Coffee,
  },
  {
    status: "shipped",
    label: "On the road",
    hint: "Rider dispatched — cup soon.",
    Icon: Truck,
  },
];

function stageIndexFor(status: OrderStatus): number {
  return STAGES.findIndex((s) => s.status === status);
}

// One colour per gap in the journey — the segment leading into stage i+1 wears
// the accent of the stage it delivers you into. Gives the row a felt "journey
// through the day" without any single wide gradient that crosses bubbles.
const SEGMENT_COLORS = [
  "#c8a15b", // → payment_pending (gold)
  "#6d8e6a", // → paid (mint)
  "#d94822", // → preparing (ember)
  "#14100b", // → shipped (ink)
];

interface Props {
  currentStatus: OrderStatus;
}

export default function BrewJourney({ currentStatus }: Props) {
  const failed =
    currentStatus === "failed" || currentStatus === "cancelled";
  const currentIndex = failed ? -1 : Math.max(0, stageIndexFor(currentStatus));
  const stage = failed ? null : STAGES[currentIndex];
  const progress = failed
    ? 0
    : STAGES.length > 1
      ? currentIndex / (STAGES.length - 1)
      : 0;

  return (
    <section className="relative overflow-hidden ticket rounded-3xl">
      {/* Warm ambient background */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-ember/15 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.9, 0.7] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-gold/15 blur-3xl"
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.6, 0.85, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Faint hatched paper texture on top */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04] mix-blend-multiply"
      >
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 6 L6 0" stroke="currentColor" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hatch)" />
      </svg>

      <div className="relative z-10 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="stamp">§ Where&apos;s my coffee?</div>
          <div className="stamp text-ink-mute">
            {Math.round(progress * 100)}% along the route
          </div>
        </div>

        {/* Big kinetic status headline that swaps on transitions */}
        <div className="relative min-h-[104px] md:min-h-[120px]">
          {failed ? (
            <FailedHeadline status={currentStatus} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStatus}
                initial={{ y: 28, opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -28, opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="display text-4xl md:text-5xl leading-none tracking-tight">
                  {stage?.label}
                  <span className="text-ember">.</span>
                </div>
                <div className="mt-2 text-ink-soft max-w-md text-sm md:text-base">
                  {stage?.hint}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Journey — bubbles interleaved with line segments so the connector
            visibly starts and stops at each bubble edge instead of crossing
            through them. */}
        <div className="mt-10">
          <div className="flex items-start gap-3" role="list">
            {STAGES.map((s, i) => {
              const done = !failed && i < currentIndex;
              const active = !failed && i === currentIndex;
              const pending = !failed && i > currentIndex;
              // A line segment sits AFTER each bubble except the last, filling
              // once the next bubble has been reached.
              const segmentFilled = !failed && i < currentIndex;
              const segmentColor = SEGMENT_COLORS[i] ?? "#d94822";
              return (
                <StageWithConnector
                  key={s.status}
                  showConnector={i < STAGES.length - 1}
                  segmentFilled={segmentFilled}
                  segmentColor={segmentColor}
                  segmentDelay={i * 0.06}
                >
                  <div
                    role="listitem"
                    className="flex flex-col items-center gap-3 text-center shrink-0 w-16"
                  >
                    <StageBubble
                      Icon={s.Icon}
                      done={done}
                      active={active}
                      pending={pending}
                      failed={failed}
                    />
                    <div
                      className={`mono text-[10px] uppercase tracking-widest leading-tight max-w-[10ch] ${
                        active
                          ? "text-ink"
                          : done
                            ? "text-mint"
                            : "text-ink-mute/70"
                      }`}
                    >
                      {humanStatus(s.status)}
                    </div>
                  </div>
                </StageWithConnector>
              );
            })}
          </div>
        </div>

        {/* Bean burst when we hit shipped */}
        {currentStatus === "shipped" && <BeanBurst />}
      </div>
    </section>
  );
}

// Wraps a stage bubble and, unless it's the last stage, appends a line
// segment as a sibling flex child. The line lives OUTSIDE the bubble column,
// so it can never overlap with a circle.
function StageWithConnector({
  showConnector,
  segmentFilled,
  segmentColor,
  segmentDelay,
  children,
}: {
  showConnector: boolean;
  segmentFilled: boolean;
  segmentColor: string;
  segmentDelay: number;
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {showConnector && (
        <div
          aria-hidden
          // h-12 matches the bubble height; items-center vertically centres
          // the 3px line on the bubble centre without any pixel-math.
          className="flex-1 h-12 relative flex items-center min-w-[24px]"
        >
          <span className="absolute left-0 right-0 h-[3px] rounded-full bg-ink/10" />
          <motion.span
            className="absolute left-0 right-0 h-[3px] rounded-full origin-left"
            style={{ backgroundColor: segmentColor }}
            initial={false}
            animate={{ scaleX: segmentFilled ? 1 : 0 }}
            transition={{
              duration: 0.75,
              ease: [0.22, 1, 0.36, 1],
              delay: segmentDelay,
            }}
          />
        </div>
      )}
    </>
  );
}

function StageBubble({
  Icon,
  done,
  active,
  pending,
  failed,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  done: boolean;
  active: boolean;
  pending: boolean;
  failed: boolean;
}) {
  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`relative z-10 h-12 w-12 rounded-full border-2 flex items-center justify-center transition-colors ${
          active
            ? "bg-ink text-cream border-ink shadow-[0_10px_30px_-12px_rgba(20,16,11,0.6)]"
            : done
              ? "bg-mint/15 text-mint border-mint/50"
              : failed
                ? "bg-ember/10 text-ember-deep border-ember-deep/40"
                : "bg-paper text-ink-mute border-ink/15"
        }`}
      >
        {/* Active ring pulse */}
        {active && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-ember"
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: 1.55, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {done ? (
          <Check className="h-5 w-5" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </motion.div>

      {/* Steam wisps on active stage */}
      {active && !pending && <Steam />}
    </div>
  );
}

function Steam() {
  return (
    <div aria-hidden className="absolute -top-4 left-1/2 -translate-x-1/2 h-6 w-8 pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute top-2 h-1.5 w-1.5 rounded-full bg-ink/25"
          style={{ left: `${8 + i * 8}px` }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -22, opacity: [0, 0.5, 0] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

function FailedHeadline({ status }: { status: OrderStatus }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-full bg-ember/15 text-ember-deep inline-flex items-center justify-center shrink-0">
        <AlertOctagon className="h-5 w-5" />
      </div>
      <div>
        <div className="display text-4xl md:text-5xl leading-none tracking-tight text-ember-deep">
          {humanStatus(status)}.
        </div>
        <div className="mt-2 text-ink-soft text-sm md:text-base max-w-md">
          Fulfillment halted. If this was unexpected, get in touch and
          we&apos;ll sort it.
        </div>
      </div>
    </div>
  );
}

function BeanBurst() {
  // Twelve little beans radiating outward from the top-right area.
  const beans = Array.from({ length: 14 });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-6 top-6 h-40 w-40"
    >
      {beans.map((_, i) => {
        const angle = (i / beans.length) * Math.PI * 2;
        const distance = 80 + (i % 3) * 22;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const rot = ((i * 37) % 360) - 180;
        return (
          <motion.svg
            key={i}
            viewBox="0 0 20 12"
            className="absolute left-1/2 top-1/2 h-3 w-5"
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
            animate={{
              x: dx,
              y: dy,
              opacity: [0, 1, 0.9, 0],
              rotate: rot,
              scale: 1,
            }}
            transition={{
              duration: 2.2,
              delay: (i % 6) * 0.06,
              repeat: Infinity,
              repeatDelay: 3.5,
              ease: "easeOut",
            }}
          >
            <ellipse cx="10" cy="6" rx="9" ry="5" fill="#3a1e10" />
            <path
              d="M 2 6 Q 10 3 18 6 Q 10 9 2 6"
              stroke="#d94822"
              strokeWidth="0.7"
              fill="none"
              opacity="0.7"
            />
          </motion.svg>
        );
      })}
    </div>
  );
}
