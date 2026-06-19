import type { ComponentPropsWithoutRef, ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "danger";

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: "border-info/25 bg-info-soft text-info",
  success: "border-accent/25 bg-accent-soft text-accent",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-negative/25 bg-negative-soft text-negative"
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type AlertProps = ComponentPropsWithoutRef<"div"> & {
  children?: ReactNode;
  title: string;
  variant?: AlertVariant;
};

export function Alert({ children, className, title, variant = "info", ...props }: AlertProps) {
  return (
    <div className={cn("border px-4 py-3", VARIANT_CLASSES[variant], className)} role={variant === "danger" ? "alert" : "status"} {...props}>
      <p className="text-sm font-bold">{title}</p>
      {children ? <div className="mt-0.5 text-sm text-foreground-secondary">{children}</div> : null}
    </div>
  );
}
