"use client";

import { motion } from "framer-motion";

// A tiny brewing scene: a kettle drips espresso into a cup that slowly fills.
// SVG animations keep it dependency-free and cheap to run.
function DripAnimation() {
  return (
    <div className="relative h-16 w-14 shrink-0">
      <svg viewBox="0 0 56 68" className="absolute inset-0 h-full w-full text-ink">
        {/* Kettle body */}
        <rect x="18" y="2" width="24" height="14" rx="2" fill="currentColor" />
        {/* Handle */}
        <path
          d="M 42 5 Q 52 5 52 12 Q 52 15 46 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Spout pointing down-left */}
        <path d="M 18 12 L 12 18 L 12 15 L 18 8 Z" fill="currentColor" />

        {/* Three staggered drips falling from the spout into the cup */}
        {[0, 0.3, 0.6].map((delay, i) => (
          <circle key={i} cx="13" cy="20" r="2" fill="#d94822">
            <animate
              attributeName="cy"
              values="20;44"
              keyTimes="0;1"
              dur="0.95s"
              begin={`-${delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.15;0.85;1"
              dur="0.95s"
              begin={`-${delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="1.5;2;1.2"
              dur="0.95s"
              begin={`-${delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Cup outline */}
        <path
          d="M 4 44 L 24 44 L 22 62 Q 22 66 18 66 L 10 66 Q 6 66 6 62 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Cup handle */}
        <path
          d="M 24 48 Q 30 51 24 58"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Liquid filling from the bottom */}
        <defs>
          <clipPath id="cup-clip">
            <path d="M 6 44 L 22 44 L 20 62 Q 20 65 17 65 L 11 65 Q 8 65 8 62 Z" />
          </clipPath>
        </defs>
        <rect
          x="4"
          y="66"
          width="20"
          height="0"
          fill="#d94822"
          opacity="0.85"
          clipPath="url(#cup-clip)"
        >
          <animate
            attributeName="y"
            values="66;44"
            keyTimes="0;1"
            dur="3s"
            fill="freeze"
            repeatCount="indefinite"
          />
          <animate
            attributeName="height"
            values="0;22"
            keyTimes="0;1"
            dur="3s"
            fill="freeze"
            repeatCount="indefinite"
          />
        </rect>

        {/* Steam wisps rising over the kettle */}
        {[0, 0.5, 1].map((delay, i) => (
          <circle
            key={`s-${i}`}
            cx={22 + i * 8}
            cy="4"
            r="1.4"
            fill="currentColor"
            opacity="0.2"
          >
            <animate
              attributeName="cy"
              values="4;-6"
              dur="2.4s"
              begin={`-${delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.3;0"
              dur="2.4s"
              begin={`-${delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>
    </div>
  );
}

function ShimmerBar({
  className = "",
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <div className={`relative overflow-hidden rounded-sm bg-ink/10 ${className}`}>
      <span
        aria-hidden
        className="absolute inset-y-0 -inset-x-full shimmer-sweep bg-gradient-to-r from-transparent via-cream/80 to-transparent"
        style={{ animationDelay: `${delay}s` }}
      />
    </div>
  );
}

function SkeletonRow({ index }: { index: number }) {
  const delay = (index % 5) * 0.12;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="p-5 flex items-center gap-4"
    >
      <div className="flex-1 flex flex-col gap-2">
        <ShimmerBar className="h-3 w-56 max-w-[70%]" delay={delay} />
        <ShimmerBar className="h-6 w-24" delay={delay + 0.05} />
        <ShimmerBar className="h-3 w-40 max-w-[55%]" delay={delay + 0.1} />
      </div>
      <div className="flex flex-col items-end gap-2">
        <ShimmerBar className="h-5 w-20 rounded-md" delay={delay + 0.08} />
        <ShimmerBar className="h-5 w-24 rounded-full" delay={delay + 0.15} />
      </div>
      <div className="mono text-xs text-ink-mute/25">→</div>
    </motion.div>
  );
}

const BREW_TAGS = [
  "steeping the ledger",
  "pulling shots",
  "warming the cup",
  "grinding beans",
  "checking the timer",
];

export default function OrdersLoader({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="ticket rounded-2xl p-5 flex items-center gap-5 relative overflow-hidden">
        {/* Warm ember blob backdrop */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-ember/15 blur-3xl"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <DripAnimation />
        <div className="flex-1 relative">
          <div className="display text-xl leading-none">
            Brewing your ledger
            <BouncingDots />
          </div>
          <div className="mt-2 h-4 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 flex flex-col"
              animate={{ y: [0, -16, -32, -48, -64, 0] }}
              transition={{
                duration: BREW_TAGS.length * 1.6,
                times: BREW_TAGS.map((_, i) => i / BREW_TAGS.length).concat([1]),
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {BREW_TAGS.map((tag) => (
                <span key={tag} className="stamp h-4 leading-4">
                  {tag} · pulling from the roastery
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="ticket rounded-2xl divide-y divide-ink/10">
        {Array.from({ length: Math.max(1, count) }).map((_, i) => (
          <SkeletonRow key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

function BouncingDots() {
  return (
    <span className="inline-flex items-baseline ml-1 gap-0.5">
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-ember"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.9,
            delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}
