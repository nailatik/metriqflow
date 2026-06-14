interface StatProps {
  label: string;
  value: string | number | null | undefined;
  sub?: string;
  className?: string;
}

export function Stat({ label, value, sub, className = "" }: StatProps) {
  return (
    <div className={`bg-surface border border-border rounded-xl shadow-card p-4 ${className}`}>
      <p className="text-xs text-textSecondary mb-1">{label}</p>
      <p className="text-2xl font-mono font-bold text-textMain tabular-nums">
        {value ?? "—"}
      </p>
      {sub && <p className="text-xs text-textSecondary mt-0.5">{sub}</p>}
    </div>
  );
}
