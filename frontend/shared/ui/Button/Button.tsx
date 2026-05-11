"use client";

import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary text-white hover:opacity-90 shadow-sm",
  secondary: "bg-surface text-textMain border border-border hover:bg-border",
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
