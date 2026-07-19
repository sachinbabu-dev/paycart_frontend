interface Props {
  stock: number | undefined;
}

export default function StockPill({ stock }: Props) {
  if (stock === undefined) {
    return (
      <span className="stamp inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-mute/40" />
        stock — checking
      </span>
    );
  }
  if (stock <= 0) {
    return (
      <span className="stamp inline-flex items-center gap-1.5 text-ink-mute">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-mute" />
        sold out — restocking soon
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="stamp inline-flex items-center gap-1.5 text-ember-deep">
        <span className="h-1.5 w-1.5 rounded-full bg-ember ember-dot" />
        only {stock} bags left
      </span>
    );
  }
  if (stock <= 20) {
    return (
      <span className="stamp inline-flex items-center gap-1.5 text-gold">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        {stock} in stock
      </span>
    );
  }
  return (
    <span className="stamp inline-flex items-center gap-1.5 text-mint">
      <span className="h-1.5 w-1.5 rounded-full bg-mint" />
      in stock
    </span>
  );
}
