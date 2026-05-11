"use client";

import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary text-white hover:bg-indigo-700 shadow-sm",
  secondary: "bg-gray-100 text-textMain hover:bg-gray-200",
  danger: "bg-red-500 text-white hover:bg-red-600",
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
