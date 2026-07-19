import { AlertCircle } from "lucide-react";

interface Props {
  title: string;
  children?: React.ReactNode;
  tone?: "info" | "warn" | "error";
}

export default function Notice({ title, children, tone = "info" }: Props) {
  const borderClass =
    tone === "error"
      ? "border-ember"
      : tone === "warn"
        ? "border-gold"
        : "border-ink/20";
  const iconClass =
    tone === "error"
      ? "text-ember"
      : tone === "warn"
        ? "text-gold"
        : "text-ink-soft";
  return (
    <div
      className={`ticket rounded-xl p-4 flex gap-3 items-start border-l-4 ${borderClass}`}
    >
      <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${iconClass}`} />
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        {children && <div className="text-sm text-ink-soft mt-1">{children}</div>}
      </div>
    </div>
  );
}
