import React from "react";

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "email";
  label?: string;
}

const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder,
  type = "text",
  label,
}) => {
  return (
    <div className="w-full flex flex-col gap-1">
      
      {label && (
        <label className="text-sm text-textSecondary font-medium">
          {label}
        </label>
      )}

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full
          px-3 py-2
          rounded-xl
          border border-border
          bg-white
          text-textMain
          placeholder:text-gray-400
          focus:outline-none
          focus:ring-2
          focus:ring-primary/30
          focus:border-primary
          transition-all
        "
      />
    </div>
  );
};

export default Input;