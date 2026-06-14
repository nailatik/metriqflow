import { type ReactNode } from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "muted";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default:  "bg-surfaceMuted text-textMain border border-border",
  primary:  "bg-primary/10 text-primary border border-primary/20",
  success:  "bg-success/10 text-success border border-success/20",
  warning:  "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/30",
  danger:   "bg-error/10 text-error border border-error/20",
  muted:    "bg-surfaceMuted text-textSecondary border border-border",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
