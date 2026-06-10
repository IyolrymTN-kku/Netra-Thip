"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { FindingStatus } from "@prisma/client";
import { Icon } from "@/components/icons/Icon";
import {
  formatMetloLastActive,
  type MetloAuthState,
  type MetloEndpointEntry,
} from "./metlo-display";
import type { FindingRow } from "./types";

type RiskFilter = "ALL" | "NONE" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type StatusFilter = "ALL" | FindingStatus;
type MetloTab = "ALL" | "NEW";

interface MetloEndpointsTableProps {
  entries: MetloEndpointEntry[];
  selectedId: string | null;
  onSelect: (row: FindingRow) => void;
}

const RISK_OPTIONS: RiskFilter[] = ["ALL", "NONE", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUS_OPTIONS: StatusFilter[] = ["ALL", "OPEN", "RESOLVED", "IGNORED"];
const AUTH_OPTIONS: Array<"ALL" | MetloAuthState> = [
  "ALL",
  "AUTHENTICATED",
  "UNAUTHENTICATED",
  "UNKNOWN",
];
const NEW_ENDPOINT_MS = 24 * 60 * 60 * 1000;

const RISK_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  CRITICAL: {
    color: "var(--sev-critical)",
    bg: "rgba(225,29,72,0.12)",
    border: "rgba(225,29,72,0.24)",
  },
  HIGH: {
    color: "var(--sev-high)",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.24)",
  },
  MEDIUM: {
    color: "#EAB308",
    bg: "rgba(234,179,8,0.12)",
    border: "rgba(234,179,8,0.24)",
  },
  LOW: {
    color: "var(--ok)",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.22)",
  },
  NONE: {
    color: "var(--ok)",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.22)",
  },
  INFO: {
    color: "var(--sev-info)",
    bg: "rgba(100,116,139,0.12)",
    border: "rgba(100,116,139,0.22)",
  },
};

function RiskBadge({ risk }: { risk: string }) {
  const label = risk || "NONE";
  const tone = RISK_COLORS[label] ?? RISK_COLORS.INFO;
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 7px",
        borderRadius: 4,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
        fontSize: 10.5,
        fontWeight: 800,
      }}
    >
      {label}
    </span>
  );
}

function InlineBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "blue";
}) {
  const colors = {
    neutral: {
      color: "var(--ink-2)",
      bg: "var(--surface-2)",
      border: "var(--line)",
    },
    ok: {
      color: "var(--ok)",
      bg: "rgba(16,185,129,0.10)",
      border: "rgba(16,185,129,0.20)",
    },
    warn: {
      color: "#EAB308",
      bg: "rgba(234,179,8,0.10)",
      border: "rgba(234,179,8,0.20)",
    },
    blue: {
      color: "var(--nt-blue)",
      bg: "var(--nt-blue-50)",
      border: "color-mix(in oklab, var(--nt-blue) 30%, var(--line))",
    },
  }[tone];

  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        maxWidth: 160,
        height: 20,
        padding: "0 6px",
        borderRadius: 4,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.color,
        fontSize: 10,
        fontWeight: 800,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </span>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 128 }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.10em",
          color: "var(--ink-4)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        style={{
          height: 32,
          borderRadius: 7,
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
          color: "var(--ink-2)",
          fontSize: 12,
          padding: "0 8px",
          outline: "none",
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function renderListBadges(values: string[], emptyLabel: string) {
  if (values.length === 0) {
    return (
      <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
        {emptyLabel}
      </span>
    );
  }

  const visible = values.slice(0, 2);
  const hiddenCount = values.length - visible.length;
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {visible.map((value) => (
        <InlineBadge key={value}>{value}</InlineBadge>
      ))}
      {hiddenCount > 0 && <InlineBadge tone="blue">+{hiddenCount}</InlineBadge>}
    </div>
  );
}

function riskOf(entry: MetloEndpointEntry): string {
  return entry.metadata.riskScore || (entry.severity === "INFO" ? "NONE" : entry.severity);
}

function isNewEndpoint(entry: MetloEndpointEntry, now = Date.now()): boolean {
  return now - entry.lastActiveAt.getTime() <= NEW_ENDPOINT_MS;
}

export function MetloEndpointsTable({
  entries,
  selectedId,
  onSelect,
}: MetloEndpointsTableProps) {
  const [tab, setTab] = useState<MetloTab>("ALL");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [hostFilter, setHostFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [authFilter, setAuthFilter] = useState<"ALL" | MetloAuthState>("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState("ALL");
  const [permissionFilter, setPermissionFilter] = useState("ALL");
  const [sensitiveFilter, setSensitiveFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const methodOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(entries.map((entry) => entry.method ?? "API"))).sort()],
    [entries],
  );
  const hostOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(entries.map((entry) => entry.host))).sort()],
    [entries],
  );
  const visibilityOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(entries.map((entry) => entry.metadata.visibility))).sort()],
    [entries],
  );
  const permissionOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(entries.flatMap((entry) => entry.metadata.permissions))).sort(),
    ],
    [entries],
  );
  const sensitiveOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(entries.flatMap((entry) => entry.metadata.sensitiveData))).sort(),
    ],
    [entries],
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const now = Date.now();
    const next = entries.filter((entry) => {
      const risk = riskOf(entry);
      const haystack = [
        entry.endpointLabel,
        entry.host,
        entry.target,
        entry.metadata.visibility,
        entry.metadata.authenticated,
        ...entry.metadata.permissions,
        ...entry.metadata.sensitiveData,
      ].join(" ").toLowerCase();

      return (
        (tab === "ALL" || isNewEndpoint(entry, now)) &&
        (!normalizedSearch || haystack.includes(normalizedSearch)) &&
        (methodFilter === "ALL" || (entry.method ?? "API") === methodFilter) &&
        (hostFilter === "ALL" || entry.host === hostFilter) &&
        (riskFilter === "ALL" || risk === riskFilter) &&
        (authFilter === "ALL" || entry.metadata.authenticated === authFilter) &&
        (visibilityFilter === "ALL" || entry.metadata.visibility === visibilityFilter) &&
        (permissionFilter === "ALL" || entry.metadata.permissions.includes(permissionFilter)) &&
        (sensitiveFilter === "ALL" || entry.metadata.sensitiveData.includes(sensitiveFilter)) &&
        (statusFilter === "ALL" || entry.status === statusFilter)
      );
    });

    next.sort((a, b) => {
      const diff = b.lastActiveAt.getTime() - a.lastActiveAt.getTime();
      return sortOrder === "desc" ? diff : -diff;
    });
    return next;
  }, [
    entries,
    tab,
    search,
    methodFilter,
    hostFilter,
    riskFilter,
    authFilter,
    visibilityFilter,
    permissionFilter,
    sensitiveFilter,
    statusFilter,
    sortOrder,
  ]);

  const newCount = useMemo(() => entries.filter((entry) => isNewEndpoint(entry)).length, [entries]);

  return (
    <div className="nt-card" style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "14px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Endpoints</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                <span className="mono tnum">{filtered.length}</span> of{" "}
                <span className="mono tnum">{entries.length}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["ALL", "NEW"] as MetloTab[]).map((nextTab) => (
                <button
                  key={nextTab}
                  type="button"
                  onClick={() => setTab(nextTab)}
                  className="nt-chip-opt"
                  data-on={tab === nextTab}
                  style={{ height: 26, minWidth: 58, fontSize: 11 }}
                >
                  {nextTab}
                  {nextTab === "NEW" && (
                    <span className="mono" style={{ marginLeft: 5 }}>
                      {newCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn btn-sm" disabled>
            <Icon name="download" size={12} />
            Export
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1.6fr) repeat(4, minmax(128px, 1fr))",
            gap: 10,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.10em",
                color: "var(--ink-4)",
                textTransform: "uppercase",
              }}
            >
              Search
            </span>
            <div style={{ position: "relative" }}>
              <Icon
                name="search"
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: 9,
                  color: "var(--ink-4)",
                }}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search endpoint..."
                style={{
                  width: "100%",
                  height: 32,
                  borderRadius: 7,
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  color: "var(--ink-2)",
                  fontSize: 12,
                  padding: "0 10px 0 32px",
                  outline: "none",
                }}
              />
            </div>
          </label>
          <FilterSelect
            label="Method"
            value={methodFilter}
            options={methodOptions}
            onChange={setMethodFilter}
          />
          <FilterSelect
            label="Host"
            value={hostFilter}
            options={hostOptions}
            onChange={setHostFilter}
          />
          <FilterSelect
            label="Risk"
            value={riskFilter}
            options={RISK_OPTIONS}
            onChange={setRiskFilter}
          />
          <FilterSelect
            label="Authenticated"
            value={authFilter}
            options={AUTH_OPTIONS}
            onChange={setAuthFilter}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <FilterSelect
            label="Visibility"
            value={visibilityFilter}
            options={visibilityOptions}
            onChange={setVisibilityFilter}
          />
          <FilterSelect
            label="Permissions"
            value={permissionFilter}
            options={permissionOptions}
            onChange={setPermissionFilter}
          />
          <FilterSelect
            label="Sensitive Data"
            value={sensitiveFilter}
            options={sensitiveOptions}
            onChange={setSensitiveFilter}
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={setStatusFilter}
          />
        </div>
      </div>

      <div style={{ height: 1, background: "var(--line)" }} />

      <div style={{ overflow: "auto", maxHeight: 560 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.10em",
                color: "var(--ink-3)",
                textTransform: "uppercase",
                background: "var(--surface-2)",
                position: "sticky",
                top: 0,
              }}
            >
              <th style={{ padding: "8px 16px", textAlign: "left", borderBottom: "1px solid var(--line)", width: 100 }}>
                Risk
              </th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--line)", minWidth: 280 }}>
                Endpoint
              </th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--line)", width: 190 }}>
                Permissions
              </th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--line)", width: 130 }}>
                Visibility
              </th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--line)", width: 210 }}>
                Sensitive Data
              </th>
              <th
                style={{
                  padding: "8px 16px",
                  textAlign: "right",
                  borderBottom: "1px solid var(--line)",
                  width: 130,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                  Last Active
                  <Icon
                    name="chevronDown"
                    size={12}
                    style={{
                      color: "var(--ink-3)",
                      transform: sortOrder === "asc" ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>
                  No accessed Metlo endpoints match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((entry) => {
              const selected = entry.representative.id === selectedId;
              const authTone = entry.metadata.authenticated === "AUTHENTICATED" ? "ok" : "neutral";
              const visibilityTone = entry.metadata.visibility === "PRIVATE" ? "blue" : "warn";

              return (
                <tr
                  key={entry.key}
                  onClick={() => onSelect(entry.displayFinding)}
                  style={{
                    cursor: "pointer",
                    background: selected ? "var(--nt-blue-50)" : "transparent",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <td style={{ padding: "10px 16px" }}>
                    <RiskBadge risk={riskOf(entry)} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div className="mono" style={{ fontWeight: 800, color: "var(--ink)", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.endpointLabel}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                        {entry.host}
                      </span>
                      <InlineBadge tone={authTone}>{entry.metadata.authenticated}</InlineBadge>
                      {entry.metadata.requestCount !== null && (
                        <InlineBadge tone="neutral">{entry.metadata.requestCount} requests</InlineBadge>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {renderListBadges(entry.metadata.permissions, "ANY")}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <InlineBadge tone={visibilityTone}>{entry.metadata.visibility}</InlineBadge>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {renderListBadges(entry.metadata.sensitiveData, "NONE")}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <span
                      suppressHydrationWarning
                      className="mono"
                      title={entry.lastActiveAt.toLocaleString()}
                      style={{ fontSize: 11, color: "var(--ink-3)" }}
                    >
                      {formatMetloLastActive(entry.lastActiveAt)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
