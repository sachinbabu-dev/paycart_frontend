interface Props {
  seed: string;
  className?: string;
}

function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Coffee-inspired abstract art — deterministic per SKU. No external images.
export default function ProductArt({ seed, className = "" }: Props) {
  const h = hash(seed);
  const palettes = [
    ["#d94822", "#3a1e10", "#f4ecdc"],
    ["#c8a15b", "#2a1a0d", "#f4ecdc"],
    ["#6d8e6a", "#1e2a1a", "#f4ecdc"],
    ["#a83214", "#3a1e10", "#ede1c8"],
    ["#8b5a2b", "#1a1108", "#ede1c8"],
  ];
  const [a, b, bg] = palettes[h % palettes.length];
  const angle = (h % 90) - 45;
  const cx = 30 + (h % 40);
  const cy = 30 + ((h >> 4) % 40);
  const r = 24 + ((h >> 8) % 22);
  const beans = 3 + ((h >> 3) % 4);

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={`g-${seed}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={a} stopOpacity="0.85" />
          <stop offset="100%" stopColor={b} stopOpacity="1" />
        </radialGradient>
        <pattern
          id={`p-${seed}`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${angle})`}
        >
          <path d="M0 4 L8 4" stroke={a} strokeWidth="0.6" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill={bg} />
      <rect width="200" height="200" fill={`url(#p-${seed})`} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={`url(#g-${seed})`}
        style={{ mixBlendMode: "multiply" }}
      />
      {Array.from({ length: beans }).map((_, i) => {
        const bx = 40 + ((h >> (i + 2)) % 120);
        const by = 40 + ((h >> (i + 5)) % 120);
        const br = 10 + ((h >> (i + 7)) % 14);
        return (
          <g key={i} transform={`translate(${bx} ${by}) rotate(${(h >> i) % 180})`}>
            <ellipse cx="0" cy="0" rx={br} ry={br * 0.65} fill={b} opacity="0.85" />
            <path
              d={`M ${-br * 0.7} 0 Q 0 ${-br * 0.35} ${br * 0.7} 0 Q 0 ${br * 0.35} ${-br * 0.7} 0`}
              stroke={a}
              strokeWidth="0.8"
              fill="none"
              opacity="0.7"
            />
          </g>
        );
      })}
      <text
        x="12"
        y="188"
        fontFamily="ui-monospace, monospace"
        fontSize="8"
        fill={b}
        opacity="0.6"
      >
        LOT · {seed.slice(0, 12).toUpperCase()}
      </text>
    </svg>
  );
}
