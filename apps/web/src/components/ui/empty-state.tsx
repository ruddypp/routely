import type { ComponentPropsWithoutRef, ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type EmptyStateProps = ComponentPropsWithoutRef<"div"> & {
  action?: ReactNode;
  icon?: ReactNode;
  message: string;
  title: string;
};

export function EmptyState({ action, className, icon, message, title, ...props }: EmptyStateProps) {
  return (
    <div className={cn("px-4 py-10 text-center", className)} {...props}>
      {icon ? (
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-md border border-border bg-surface-raised text-sm font-black text-muted shadow-[var(--inset-border)]">
          {icon}
        </div>
      ) : null}
      <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{message}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
