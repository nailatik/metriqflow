"use client";

import { useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id: externalId, className = "", ...rest }: InputProps) {
  const autoId = useId();
  const id = externalId ?? autoId;

  return (
    <div className="w-full flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-textSecondary">
          {label}
        </label>
      )}
      <input
        id={id}
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
