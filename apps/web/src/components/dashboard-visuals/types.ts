export type Tone = "ok" | "warn" | "error" | "muted" | "info";

export type HostResourceSample = {
  label: string;
  cpu: number | null;
  memory: number | null;
};

export type DiskUsageValue = {
  usedBytes: number | null;
  totalBytes: number | null;
  usedLabel: string;
  totalLabel: string;
  percent: number | null;
};

export type AppStatusDatum = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type TrafficPoint = {
  label: string;
  value: number;
};

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: Tone;
};
