import type { FindingStatus, Severity } from "@prisma/client";
import type { FindingRow } from "./types";

const METLO_TOOL = "metlo";
const HTTP_METHOD_RE =
  /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)\s+([^\s,;]+)/i;
const ABSOLUTE_URL_RE = /^https?:\/\//i;
const TITLE_PREFIX_RE =
  /^(?:metlo\s+alert\s*[-:]\s*)?(?:new\s+endpoint\s+detected|endpoint\s+detected)\s*(?:[-:\u2013\u2014]\s*)?/i;
const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
};

export type MetloEndpointEntry = {
  key: string;
  endpointLabel: string;
  method: string | null;
  path: string;
  host: string;
  target: string;
  findings: FindingRow[];
  representative: FindingRow;
  displayFinding: FindingRow;
  severity: Severity;
  cvss: number | null;
  status: FindingStatus;
  lastActiveAt: Date;
  metadata: MetloEndpointMetadata;
};

export type MetloAuthState = "AUTHENTICATED" | "UNAUTHENTICATED" | "UNKNOWN";

export type MetloEndpointMetadata = {
  authenticated: MetloAuthState;
  visibility: string;
  permissions: string[];
  sensitiveData: string[];
  piiFieldCount: number | null;
  requestCount: number | null;
  riskScore: string;
  lastActiveAt: Date | null;
};

type MetloEndpointParts = {
  endpointLabel: string;
  method: string | null;
  path: string;
  host: string;
};

export function isMetloFinding(row: FindingRow): boolean {
  return row.scanJob.toolName.toLowerCase() === METLO_TOOL;
}

export function stripMetloTitlePrefix(title: string): string {
  return title.trim().replace(TITLE_PREFIX_RE, "").trim();
}

export function getMetloLastActiveAt(row: FindingRow): Date {
  const updatedAt = new Date(row.updatedAt);
  const createdAt = new Date(row.createdAt);
  return updatedAt.getTime() > createdAt.getTime() ? updatedAt : createdAt;
}

export function formatMetloLastActive(date: Date, now = new Date()): string {
  const elapsedMs = Math.max(0, now.getTime() - new Date(date).getTime());
  const seconds = Math.floor(elapsedMs / 1000);
  if (seconds < 60) return pluralize(seconds, "second");

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return pluralize(minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return pluralize(hours, "hour");

  const days = Math.floor(hours / 24);
  if (days < 30) return pluralize(days, "day");

  const months = Math.floor(days / 30);
  if (months < 12) return pluralize(months, "month");

  return pluralize(Math.floor(months / 12), "year");
}

export function buildMetloEndpointEntries(rows: FindingRow[]): MetloEndpointEntry[] {
  const groups = new Map<string, MetloEndpointEntry>();

  for (const row of rows) {
    if (!isMetloFinding(row)) continue;

    const endpoint = getMetloEndpointParts(row);
    if (!endpoint) continue;

    const metadata = getMetloEndpointMetadata(row);
    const key = [
      row.scanJobId,
      endpoint.host.toLowerCase(),
      endpoint.method ?? "",
      endpoint.path.toLowerCase(),
    ].join(":");
    const lastActiveAt = getMetloLastActiveAt(row);
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        key,
        ...endpoint,
        target: row.target,
        findings: [row],
        representative: row,
        displayFinding: toMetloDisplayFinding(row, endpoint.endpointLabel),
        severity: row.severity,
        cvss: row.cvss ?? null,
        status: row.status,
        lastActiveAt,
        metadata,
      });
      continue;
    }

    current.findings.push(row);
    current.metadata = mergeMetloMetadata(current.metadata, metadata);
    if (isHigherSeverity(row.severity, current.severity)) {
      current.severity = row.severity;
    }
    if ((row.cvss ?? -1) > (current.cvss ?? -1)) {
      current.cvss = row.cvss ?? null;
    }
    if (lastActiveAt.getTime() >= current.lastActiveAt.getTime()) {
      current.representative = row;
      current.target = row.target;
      current.status = row.status;
      current.lastActiveAt = lastActiveAt;
      current.displayFinding = toMetloDisplayFinding(row, endpoint.endpointLabel);
      current.metadata = mergeMetloMetadata(metadata, current.metadata);
    }
  }

  return Array.from(groups.values())
    .map((entry) => ({
      ...entry,
      displayFinding: {
        ...entry.displayFinding,
        severity: entry.severity,
        cvss: entry.cvss,
        updatedAt: entry.lastActiveAt,
      },
    }))
    .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
}

export function getMetloEndpointMetadata(row: FindingRow): MetloEndpointMetadata {
  const source = findMetloMetadataSource(row);
  const sensitiveData = normalizeStringList(
    firstValue(
      source?.sensitiveData,
      source?.sensitive_data,
      source?.sensitiveDataClasses,
      source?.sensitive_data_classes,
      source?.detectedFields,
      source?.detected_fields,
      source?.piiFields,
      source?.pii_fields,
    ),
  );
  const piiFieldCount = numberOrNull(
    firstValue(
      source?.piiFieldCount,
      source?.pii_field_count,
      source?.numPiiFields,
      source?.num_pii_fields,
      source?.sensitiveFieldCount,
      source?.sensitive_field_count,
    ),
  );

  return {
    authenticated: normalizeAuthState(
      firstValue(source?.authenticated, source?.authState, source?.auth_state),
    ),
    visibility: normalizeVisibility(firstValue(source?.visibility, source?.access)),
    permissions: normalizeStringList(firstValue(source?.permissions, source?.permission)),
    sensitiveData,
    piiFieldCount: piiFieldCount ?? (sensitiveData.length > 0 ? sensitiveData.length : null),
    requestCount: numberOrNull(
      firstValue(
        source?.requestCount,
        source?.request_count,
        source?.requests,
        source?.hits,
        source?.count,
      ),
    ),
    riskScore: normalizeRiskScore(
      firstValue(source?.riskScore, source?.risk_score, source?.risk, row.severity),
    ),
    lastActiveAt: parseOptionalDate(
      firstValue(
        source?.lastActiveAt,
        source?.last_active_at,
        source?.lastActive,
        source?.last_active,
        source?.lastSeenAt,
        source?.last_seen_at,
        source?.lastSeen,
        source?.last_seen,
      ),
    ),
  };
}

export function toMetloDisplayFinding(
  row: FindingRow,
  endpointLabel = getMetloDisplayTitle(row),
): FindingRow {
  return {
    ...row,
    title: endpointLabel,
  };
}

export function getMetloDisplayTitle(row: FindingRow): string {
  return getMetloEndpointParts(row)?.endpointLabel ?? stripMetloTitlePrefix(row.title);
}

function getMetloEndpointParts(row: FindingRow): MetloEndpointParts | null {
  const metadataSource = findMetloMetadataSource(row);
  const metadataHost = typeof metadataSource?.host === "string" ? metadataSource.host : "";
  const metadataMethod =
    typeof metadataSource?.method === "string" ? metadataSource.method : "";
  const metadataPath =
    typeof metadataSource?.path === "string" ? metadataSource.path : "";
  const host = getHost(row.target);
  if (metadataHost && metadataMethod && metadataPath) {
    const parts = buildEndpointParts(metadataMethod.toUpperCase(), metadataPath, host);
    if (parts) {
      return {
        ...parts,
        host: metadataHost,
      };
    }
  }

  const title = stripMetloTitlePrefix(row.title);
  const fromTitle = parseEndpointText(title, host);
  if (fromTitle) return fromTitle;

  const fromDescription = parseEndpointText(row.description, host);
  if (fromDescription) return fromDescription;

  const fromTarget = parseEndpointText(row.target, host, { requireNonRoot: true });
  if (fromTarget) return fromTarget;

  return null;
}

function parseEndpointText(
  text: string,
  fallbackHost: string,
  options: { requireNonRoot?: boolean } = {},
): MetloEndpointParts | null {
  const value = text.trim();
  if (!value) return null;

  const methodMatch = value.match(HTTP_METHOD_RE);
  if (methodMatch) {
    return buildEndpointParts(
      methodMatch[1].toUpperCase(),
      methodMatch[2],
      fallbackHost,
      options,
    );
  }

  if (ABSOLUTE_URL_RE.test(value)) {
    return buildEndpointParts(null, value, fallbackHost, options);
  }

  const pathMatch = value.match(/(?:^|\s)(\/[^\s,;]*)/);
  if (pathMatch) {
    return buildEndpointParts(null, pathMatch[1], fallbackHost, options);
  }

  return null;
}

function buildEndpointParts(
  method: string | null,
  rawPath: string,
  fallbackHost: string,
  options: { requireNonRoot?: boolean } = {},
): MetloEndpointParts | null {
  const parsed = parseEndpointPath(rawPath);
  if (!parsed.path) return null;

  const normalizedPath = normalizeEndpointPath(parsed.path);
  if (options.requireNonRoot && normalizedPath === "/") return null;

  return {
    endpointLabel: method ? `${method} ${normalizedPath}` : normalizedPath,
    method,
    path: normalizedPath,
    host: parsed.host || fallbackHost,
  };
}

function parseEndpointPath(rawPath: string): { path: string; host: string } {
  const trimmed = rawPath.trim().replace(/[),.]+$/, "");
  if (!trimmed) return { path: "", host: "" };

  if (ABSOLUTE_URL_RE.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return { path: url.pathname || "/", host: url.host };
    } catch {
      return { path: "", host: "" };
    }
  }

  return { path: trimmed, host: "" };
}

function normalizeEndpointPath(path: string): string {
  const [withoutHash] = path.split("#", 1);
  const [withoutQuery] = withoutHash.split("?", 1);
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  return normalized || "/";
}

function getHost(target: string): string {
  try {
    return new URL(target).host;
  } catch {
    return target.replace(/^https?:\/\//i, "").split("/")[0] || target;
  }
}

function isHigherSeverity(candidate: Severity, current: Severity): boolean {
  return SEVERITY_RANK[candidate] > SEVERITY_RANK[current];
}

function findMetloMetadataSource(row: FindingRow): Record<string, unknown> | null {
  const records = Array.isArray(row.cves)
    ? (row.cves as unknown[]).filter(isRecord)
    : [];
  const explicit = records.find((record) => {
    const kind = String(firstValue(record.kind, record.type, record.source) ?? "").toLowerCase();
    return kind.includes("metlo") || kind.includes("endpoint-metadata");
  });
  if (explicit) return explicit;

  return (
    records.find((record) =>
      [
        "authenticated",
        "visibility",
        "permissions",
        "sensitiveData",
        "sensitive_data",
        "requestCount",
        "riskScore",
      ].some((key) => key in record),
    ) ?? null
  );
}

function mergeMetloMetadata(
  primary: MetloEndpointMetadata,
  secondary: MetloEndpointMetadata,
): MetloEndpointMetadata {
  return {
    authenticated:
      primary.authenticated !== "UNKNOWN" ? primary.authenticated : secondary.authenticated,
    visibility: primary.visibility !== "UNKNOWN" ? primary.visibility : secondary.visibility,
    permissions: uniqueList([...primary.permissions, ...secondary.permissions]),
    sensitiveData: uniqueList([...primary.sensitiveData, ...secondary.sensitiveData]),
    piiFieldCount: primary.piiFieldCount ?? secondary.piiFieldCount,
    requestCount: primary.requestCount ?? secondary.requestCount,
    riskScore: primary.riskScore !== "NONE" ? primary.riskScore : secondary.riskScore,
    lastActiveAt: primary.lastActiveAt ?? secondary.lastActiveAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function firstValue(...values: unknown[]): unknown {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    return value;
  }
  return undefined;
}

function normalizeAuthState(value: unknown): MetloAuthState {
  if (typeof value === "boolean") return value ? "AUTHENTICATED" : "UNAUTHENTICATED";
  const normalized = String(value ?? "").toLowerCase().trim();
  if (!normalized) return "UNKNOWN";
  if (normalized.includes("unauth") || normalized === "false" || normalized === "none") {
    return "UNAUTHENTICATED";
  }
  if (normalized.includes("auth") || normalized === "true") return "AUTHENTICATED";
  return "UNKNOWN";
}

function normalizeVisibility(value: unknown): string {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.toUpperCase() : "UNKNOWN";
}

function normalizeRiskScore(value: unknown): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "NONE";
  if (normalized.toUpperCase() === "INFO") return "NONE";
  return normalized.toUpperCase();
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueList(value.flatMap((item) => normalizeStringList(item)));
  }
  if (isRecord(value)) {
    return normalizeStringList(
      firstValue(
        value.name,
        value.label,
        value.type,
        value.class,
        value.dataClass,
        value.data_class,
        value.fieldName,
        value.field_name,
      ),
    );
  }

  const raw = String(value ?? "").trim();
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      return normalizeStringList(JSON.parse(raw));
    } catch {
      return [raw];
    }
  }

  return raw
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function numberOrNull(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseOptionalDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value > 1_000_000_000_000 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    const date = new Date(numeric > 1_000_000_000_000 ? numeric : numeric * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pluralize(value: number, unit: string): string {
  const displayValue = Math.max(1, value);
  return `${displayValue} ${unit}${displayValue === 1 ? "" : "s"} ago`;
}
