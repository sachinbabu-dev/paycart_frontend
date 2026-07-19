// UK-focused storefront: prices come from the API in USD (minor units, i.e.
// cents). We convert to GBP at a fixed demo rate and render in en-GB. If the
// upstream ever starts sending GBP, we skip the conversion.
export const DISPLAY_CURRENCY = "GBP";
export const DISPLAY_LOCALE = "en-GB";
export const USD_TO_GBP = 0.79;

function convert(minor: number, sourceCurrency: string): number {
  const src = sourceCurrency.toUpperCase();
  if (src === DISPLAY_CURRENCY) return minor / 100;
  if (src === "USD") return (minor / 100) * USD_TO_GBP;
  return minor / 100; // unknown currency: render as-is under GBP symbol
}

export function formatMoney(
  amountInMinorUnits: string | number,
  currency: string,
): string {
  const minor =
    typeof amountInMinorUnits === "string"
      ? Number(amountInMinorUnits)
      : amountInMinorUnits;
  if (!Number.isFinite(minor)) {
    return `${amountInMinorUnits} ${currency.toUpperCase()}`;
  }
  const value = convert(minor, currency);
  try {
    return new Intl.NumberFormat(DISPLAY_LOCALE, {
      style: "currency",
      currency: DISPLAY_CURRENCY,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `£${value.toFixed(2)}`;
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function humanStatus(status: string): string {
  return status
    .split("_")
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join(" ");
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
