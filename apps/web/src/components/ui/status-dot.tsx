import type { ComponentPropsWithoutRef } from "react";

type StatusTone = "success" | "info" | "warning" | "danger" | "muted";

const STATUS_TONE_BY_VALUE: Record<string, StatusTone> = {
  accepted: "success",
  active: "success",
  connected: "success",
  deployed: "success",
  healthy: "success",
  ok: "success",
  ready: "success",
  running: "success",
  succeeded: "success",
  verified: "success",
  building: "info",
  checking: "info",
  healthchecking: "info",
  issuing: "info",
  preparing: "info",
  starting: "info",
  queued: "info",
  pending: "warning",
  stopped: "warning",
  warn: "warning",
  disabled: "muted",
  inactive: "muted",
  missing: "muted",
  never: "muted",
  unknown: "muted",
  crashed: "danger",
  error: "danger",
  failed: "danger",
  unhealthy: "danger"
};

const TONE_CLASSES: Record<StatusTone, { dot: string; text: string; surface: string; border: string }> = {
  success: {
    dot: "bg-accent",
    text: "text-accent",
    surface: "bg-accent-soft",
    border: "border-accent/25"
  },
  info: {
    dot: "bg-info",
    text: "text-info",
    surface: "bg-info-soft",
    border: "border-info/25"
  },
  warning: {
    dot: "bg-warning",
    text: "text-warning",
    surface: "bg-warning-soft",
    border: "border-warning/25"
  },
  danger: {
    dot: "bg-negative",
    text: "text-negative",
    surface: "bg-negative-soft",
    border: "border-negative/25"
  },
  muted: {
    dot: "bg-muted",
    text: "text-muted",
    surface: "bg-surface-raised",
    border: "border-border"
  }
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getStatusTone(status: string | null | undefined): StatusTone {
  if (!status) return "muted";
  return STATUS_TONE_BY_VALUE[status.toLowerCase()] || "muted";
}

export function getStatusClasses(status: string | null | undefined) {
  return TONE_CLASSES[getStatusTone(status)];
}

export type StatusDotProps = ComponentPropsWithoutRef<"span"> & {
  status?: string | null;
  tone?: StatusTone;
};

export function StatusDot({ className, status, tone, ...props }: StatusDotProps) {
  const classes = TONE_CLASSES[tone || getStatusTone(status)];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", classes.dot, className)}
      {...props}
    />
  );
}
