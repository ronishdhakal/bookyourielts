"use client";

import { useId } from "react";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  textarea?: boolean;
}

/** Labelled input with an inline error that screen readers announce. */
export function TextField({ label, value, onChange, error, hint, textarea, id, ...rest }: Props) {
  const auto = useId();
  const fid = id ?? auto;
  const describedBy =
    [error ? `${fid}-err` : null, hint ? `${fid}-hint` : null].filter(Boolean).join(" ") ||
    undefined;
  const common = {
    id: fid,
    value,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: "field-input",
  } as const;
  return (
    <div>
      <label htmlFor={fid} className="field-label">
        {label}
        {rest.required && <span className="text-crimson"> *</span>}
      </label>
      {textarea ? (
        <textarea
          {...common}
          rows={4}
          maxLength={rest.maxLength}
          onChange={(e) => onChange(e.target.value)}
          className="field-input min-h-28 py-3"
        />
      ) : (
        <input {...common} {...rest} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && !error && (
        <p id={`${fid}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fid}-err`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="border-crimson bg-white-ish text-crimson rounded-md border-2 px-4 py-3 font-medium"
    >
      {message}
    </div>
  );
}
