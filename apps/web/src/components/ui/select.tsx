import type { SelectHTMLAttributes } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type SelectOption = { label: string; value: string } | string;

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
  helper?: string;
  label: string;
  options?: SelectOption[];
  wide?: boolean;
};

export function Select({ children, className, error, helper, id, label, options, wide, ...props }: SelectProps) {
  const selectId = id || `select-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const helperId = `${selectId}-helper`;

  return (
    <label className={wide ? "md:col-span-2" : undefined} htmlFor={selectId}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <select
        id={selectId}
        aria-describedby={error || helper ? helperId : undefined}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-9 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground shadow-[var(--inset-border)] transition duration-150 hover:border-border-strong focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-55",
          error && "border-negative focus:border-negative focus-visible:outline-negative",
          className
        )}
        {...props}
      >
        {options
          ? options.map((option) => {
              const value = typeof option === "string" ? option : option.value;
              const optionLabel = typeof option === "string" ? option : option.label;
              return (
                <option key={value} value={value}>
                  {optionLabel}
                </option>
              );
            })
          : children}
      </select>
      {error || helper ? (
        <span id={helperId} className={cn("mt-1 block text-[11px]", error ? "text-negative" : "text-muted")}>{error || helper}</span>
      ) : null}
    </label>
  );
}
