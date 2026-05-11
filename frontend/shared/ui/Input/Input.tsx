"use client";

import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...rest }: InputProps) {
  return (
    <div className="w-full flex flex-col gap-1">
      {label && (
        <label className="text-sm text-textSecondary">{label}</label>
      )}
      <input
        className={`
          w-full px-4 py-3 border rounded-xl outline-none transition
          bg-surface text-textMain
          ${error ? "border-red-500" : "border-border"}
          focus:border-primary
          ${className}
        `}
        {...rest}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
