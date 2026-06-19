import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const LABEL_CLASSES = "mb-1 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted";
const CONTROL_CLASSES =
  "w-full border border-border bg-surface-raised text-sm text-foreground shadow-[var(--inset-border)] transition duration-150 placeholder:text-muted/70 hover:border-border-strong focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-55";

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  helper?: string;
  label: string;
  mono?: boolean;
  wide?: boolean;
};

export function Field({ className, error, helper, id, label, mono, wide, ...props }: FieldProps) {
  const inputId = id || `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const helperId = `${inputId}-helper`;

  return (
    <label className={wide ? "md:col-span-2" : undefined} htmlFor={inputId}>
      <span className={LABEL_CLASSES}>
        <span>{label}</span>
        {error ? <span className="normal-case tracking-normal text-negative">{error}</span> : null}
      </span>
      <input
        id={inputId}
        aria-describedby={error || helper ? helperId : undefined}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-9 rounded-md px-3",
          CONTROL_CLASSES,
          error && "border-negative shadow-[rgb(9,11,10)_0_1px_0,var(--negative)_0_0_0_1px_inset] focus:border-negative focus-visible:outline-negative",
          mono && "font-mono text-xs",
          className
        )}
        {...props}
      />
      {error || helper ? (
        <span id={helperId} className={cn("mt-1 block text-[11px]", error ? "text-negative" : "text-muted")}>{error || helper}</span>
      ) : null}
    </label>
  );
}

export type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  helper?: string;
  label: string;
  mono?: boolean;
  wide?: boolean;
};

export function TextAreaField({ className, error, helper, id, label, mono, wide = true, ...props }: TextAreaFieldProps) {
  const inputId = id || `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const helperId = `${inputId}-helper`;

  return (
    <label className={wide ? "md:col-span-2" : undefined} htmlFor={inputId}>
      <span className={LABEL_CLASSES}>{label}</span>
      <textarea
        id={inputId}
        aria-describedby={error || helper ? helperId : undefined}
        aria-invalid={Boolean(error)}
        className={cn(
          "min-h-[86px] resize-y rounded-md px-3 py-2",
          CONTROL_CLASSES,
          error && "border-negative shadow-[rgb(9,11,10)_0_1px_0,var(--negative)_0_0_0_1px_inset] focus:border-negative focus-visible:outline-negative",
          mono && "font-mono text-xs",
          className
        )}
        {...props}
      />
      {error || helper ? (
        <span id={helperId} className={cn("mt-1 block text-[11px]", error ? "text-negative" : "text-muted")}>{error || helper}</span>
      ) : null}
    </label>
  );
}
