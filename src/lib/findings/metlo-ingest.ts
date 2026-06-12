import type { FindingInput } from "./schema";

const METLO_TIMESTAMP_KEYS = [
  "lastActiveAt",
  "lastActive",
  "last_active",
  "lastSeenAt",
  "lastSeen",
  "last_seen",
  "accessedAt",
  "accessed_at",
  "updatedAt",
  "createdAt",
];

export type MetloFindingDates = {
  createdAt?: Date;
  updatedAt?: Date;
};

export function getMetloFindingDates(finding: FindingInput): MetloFindingDates {
  for (const key of METLO_TIMESTAMP_KEYS) {
    const parsed = parseMetloTimestamp((finding as Record<string, unknown>)[key]);
    if (parsed) {
      return {
        createdAt: parsed,
        updatedAt: parsed,
      };
    }
  }

  return {};
}

function parseMetloTimestamp(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return dateFromEpoch(value);
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return dateFromEpoch(numeric);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateFromEpoch(value: number): Date | null {
  const milliseconds = value > 1_000_000_000_000 ? value : value * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
}
