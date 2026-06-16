"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  error?: string;
}

export function Checkbox({ label, error, id: externalId, className = "", ...rest }: CheckboxProps) {
  const autoId = useId();
  const id = externalId ?? autoId;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input type="checkbox" id={id} className={`mt-1 ${className}`} {...rest} />
        <label htmlFor={id} className="text-sm text-textSecondary">
          {label}
        </label>
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
    </div>
  );
}
