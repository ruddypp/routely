import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";
type ButtonSize = "xs" | "sm" | "md";

const BASE_CLASSES =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border font-bold leading-none transition duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 aria-busy:pointer-events-none aria-busy:cursor-wait active:translate-y-px";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border-accent/35 bg-accent text-black shadow-[rgba(39,216,111,0.18)_0_0_0_1px] hover:bg-accent-hover active:bg-accent-hover",
  secondary:
    "border-border bg-surface-raised text-foreground shadow-[var(--inset-border)] hover:border-border-strong hover:bg-surface-hover active:bg-surface-card",
  ghost:
    "border-transparent bg-transparent text-muted hover:bg-white/[0.045] hover:text-foreground active:bg-white/[0.065]",
  danger:
    "border-negative/35 bg-negative-soft text-negative hover:bg-negative/20 active:bg-negative/25",
  icon:
    "border-border bg-surface-raised text-muted shadow-[var(--inset-border)] hover:bg-surface-hover hover:text-foreground active:bg-surface-card"
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "h-7 rounded-md px-2 text-[11px]",
  sm: "h-8 rounded-md px-3 text-xs",
  md: "h-9 rounded-md px-3.5 text-[13px]"
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "h-7 w-7 rounded-md p-0 text-[11px]",
  sm: "h-8 w-8 rounded-md p-0 text-xs",
  md: "h-9 w-9 rounded-md p-0 text-[13px]"
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function Button({
  children,
  className,
  disabled,
  leading,
  loading,
  loadingLabel = "Working",
  size = "sm",
  trailing,
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  const isIcon = variant === "icon";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        isIcon ? ICON_SIZE_CLASSES[size] : SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {loading ? <Spinner /> : leading}
      {isIcon ? <span className="sr-only">{loading ? loadingLabel : children}</span> : children}
      {!isIcon && trailing ? trailing : null}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80"
    />
  );
}
