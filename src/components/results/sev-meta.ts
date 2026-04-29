import type { Severity, FindingStatus } from "@prisma/client";

export interface SevMeta {
  color: string;
  bg: string;
  label: string;
}

export const SEV_META: Record<Severity, SevMeta> = {
  CRITICAL: { color: "var(--sev-critical)", bg: "rgba(225,29,72,0.10)", label: "Critical" },
  HIGH:     { color: "var(--sev-high)",     bg: "rgba(249,115,22,0.12)", label: "High" },
  MEDIUM:   { color: "#A47600",             bg: "rgba(234,179,8,0.16)",  label: "Medium" },
  LOW:      { color: "var(--ok)",           bg: "rgba(16,185,129,0.12)", label: "Low" },
  INFO:     { color: "var(--sev-info)",     bg: "rgba(100,116,139,0.14)", label: "Info" },
};

export interface StatusMeta {
  color: string;
  bg: string;
  label: string;
}

export const STATUS_META: Record<FindingStatus, StatusMeta> = {
  OPEN:     { color: "var(--ink-2)", bg: "var(--surface-3)",          label: "Open" },
  RESOLVED: { color: "var(--ok)",    bg: "rgba(16,185,129,0.12)",     label: "Resolved" },
  IGNORED:  { color: "var(--ink-4)", bg: "var(--surface-3)",          label: "Ignored" },
};
