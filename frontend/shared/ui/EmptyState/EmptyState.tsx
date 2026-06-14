import { type ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-surfaceMuted border border-border flex items-center justify-center mb-4">
        <span className="text-textSecondary text-xl">·</span>
      </div>
      <p className="text-sm font-medium text-textMain mb-1">{title}</p>
      {description && <p className="text-sm text-textSecondary max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
