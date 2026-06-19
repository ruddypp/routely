import type { InputHTMLAttributes } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  description?: string;
  label?: string;
};

export function Switch({ className, description, label, ...props }: SwitchProps) {
  return (
    <label className={cn("flex min-h-9 items-center justify-between gap-3 rounded-md border border-border bg-surface-raised px-3 py-2 shadow-[var(--inset-border)]", props.disabled && "opacity-60", className)}>
      {label || description ? (
        <span className="min-w-0 text-xs">
          {label ? <span className="block font-bold text-foreground">{label}</span> : null}
          {description ? <span className="block text-[11px] text-muted">{description}</span> : null}
        </span>
      ) : null}
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input type="checkbox" className="peer sr-only" {...props} />
        <span className="absolute inset-0 rounded-full border border-border bg-background-soft transition peer-checked:border-accent/35 peer-checked:bg-accent-soft peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed" />
        <span className="absolute left-1 h-3.5 w-3.5 rounded-full bg-muted transition peer-checked:translate-x-4 peer-checked:bg-accent" />
      </span>
    </label>
  );
}
