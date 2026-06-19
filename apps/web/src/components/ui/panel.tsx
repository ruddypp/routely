import type { ComponentPropsWithoutRef, ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type PanelProps = ComponentPropsWithoutRef<"section"> & {
  children: ReactNode;
  inset?: boolean;
};

export function Panel({ children, className, inset, ...props }: PanelProps) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-lg border border-panel-border bg-panel-bg shadow-[var(--panel-shadow)]",
        inset && "shadow-[var(--inset-border)]",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export type PanelHeaderProps = ComponentPropsWithoutRef<"div"> & {
  action?: ReactNode;
  eyebrow?: string;
  title: string;
};

export function PanelHeader({ action, className, eyebrow, title, ...props }: PanelHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-border bg-background-soft/65 px-4 py-3", className)} {...props}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{eyebrow}</p> : null}
        <h2 className="truncate text-sm font-bold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}
