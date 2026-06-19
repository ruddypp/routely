import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { StatusDot, getStatusClasses } from "./status-dot";

type BadgeVariant = "status" | "neutral" | "success" | "info" | "warning" | "danger";

const VARIANT_CLASSES: Record<Exclude<BadgeVariant, "status">, string> = {
  neutral: "border-border bg-surface-raised text-muted",
  success: "border-accent/25 bg-accent-soft text-accent",
  info: "border-info/25 bg-info-soft text-info",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-negative/25 bg-negative-soft text-negative"
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  children: ReactNode;
  dot?: boolean;
  status?: string | null;
  variant?: BadgeVariant;
};

export function Badge({ children, className, dot, status, variant = "neutral", ...props }: BadgeProps) {
  const statusClasses = status ? getStatusClasses(status) : null;
  const classes =
    variant === "status" && statusClasses
      ? `${statusClasses.surface} ${statusClasses.text} ${statusClasses.border}`
      : VARIANT_CLASSES[variant === "status" ? "neutral" : variant];

  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-full items-center gap-1.5 rounded-full border px-2 text-[10.5px] font-bold leading-none",
        classes,
        className
      )}
      {...props}
    >
      {dot || status ? <StatusDot status={status} /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
