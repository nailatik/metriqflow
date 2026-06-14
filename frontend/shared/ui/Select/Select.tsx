"use client";

import { useId, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, id: externalId, className = "", ...rest }: SelectProps) {
  const autoId = useId();
  const id = externalId ?? autoId;

  return (
    <div className="w-full flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-textSecondary">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`
          w-full px-4 py-3 border rounded-xl outline-none transition appearance-none
          bg-surface text-textMain cursor-pointer
          ${error ? "border-error" : "border-border"}
          focus:border-primary
          ${className}
        `}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-error text-sm">{error}</p>}
    </div>
  );
}
