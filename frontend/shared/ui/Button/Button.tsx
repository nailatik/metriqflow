"use client";

import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary text-onAccent hover:bg-primaryHover shadow-sm",
  secondary: "bg-surface text-textMain border border-border hover:bg-surfaceMuted",
  danger: "bg-error text-white hover:opacity-90",
};

export function Button({
  children,
  variant = "primary",
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`
        px-4 py-2 rounded-xl font-medium transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg
        ${variants[variant]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
