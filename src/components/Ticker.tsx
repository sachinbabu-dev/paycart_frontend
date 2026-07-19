const ITEMS = [
  "Now roasting — Ethiopia Yirgacheffe",
  "Free shipping on orders over $40",
  "Batch 0442 · pulled 14 min ago",
  "Subscribe & save 15%",
  "Cold brew concentrate — restocked",
  "Origin: Guatemala Antigua",
  "Ships next roasting day",
  "Cupping notes: jasmine · bergamot · cocoa",
];

export default function Ticker() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="bg-ink text-cream border-y border-ink overflow-hidden">
      <div className="relative">
        <div className="marquee-track flex gap-10 py-2 whitespace-nowrap mono text-xs uppercase tracking-[0.18em]">
          {doubled.map((t, i) => (
            <span key={i} className="flex items-center gap-10 shrink-0">
              <span className="text-ember">◆</span>
              <span>{t}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
