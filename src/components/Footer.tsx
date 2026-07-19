import Link from "next/link";
import { USD_TO_GBP } from "@/lib/format";

export default function Footer() {
  return (
    <footer className="border-t border-ink/15 bg-paper-2 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="display text-2xl">
            Kaffeine<span className="text-ember">.</span>Lab
          </div>
          <p className="text-sm text-ink-soft mt-2 leading-relaxed">
            Micro-lot beans, roasted in small batches, shipped the day after
            they cool.
          </p>
        </div>
        <div>
          <div className="stamp mb-2">Roastery</div>
          <ul className="space-y-1 text-sm">
            <li>Unit 4, Shoreditch Arches</li>
            <li>London EC2A 3EJ</li>
            <li>opens at 06:30 GMT</li>
          </ul>
        </div>
        <div>
          <div className="stamp mb-2">Signals</div>
          <ul className="space-y-1 text-sm mono">
            <li>Mains: 50Hz · 230V</li>
            <li>Roast batches: 3 today</li>
            <li>Queue depth: idle</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col md:flex-row gap-3 justify-between text-xs text-ink-mute">
          <span>
            © {new Date().getFullYear()} Kaffeine Lab — demo storefront ·
            registered in England. VAT included where required.
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="hover:text-ink transition-colors underline decoration-dotted underline-offset-4"
            >
              Colophon
            </Link>
            <span className="mono">
              fx · £1 ≈ ${(1 / USD_TO_GBP).toFixed(2)} · demo rate
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
