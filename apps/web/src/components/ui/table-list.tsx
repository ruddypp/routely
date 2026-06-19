import type { ComponentPropsWithoutRef, ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type TableListProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
};

export function TableList({ children, className, ...props }: TableListProps) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-surface", className)} {...props}>
      {children}
    </div>
  );
}

export type TableListRowProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
  selected?: boolean;
};

export function TableListRow({ children, className, selected, ...props }: TableListRowProps) {
  return (
    <div
      className={cn(
        "grid min-h-12 gap-3 border-b border-border px-4 py-3 transition duration-150 last:border-b-0 hover:bg-white/[0.035]",
        selected && "bg-white/[0.055] shadow-[3px_0_0_0_var(--accent)_inset]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type TableListHeaderProps = ComponentPropsWithoutRef<"div"> & {
  count?: number;
  title: string;
};

export function TableListHeader({ className, count, title, ...props }: TableListHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between border-b border-border bg-background-soft/65 px-4 py-2", className)} {...props}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{title}</p>
      {count == null ? null : <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold text-muted">{count}</span>}
    </div>
  );
}
