import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-surface border border-border rounded-xl shadow-card ${className}`}>
      {children}
    </div>
  );
}
