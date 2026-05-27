"use client";

import { useMemo, useState, Fragment } from "react";
import type { FindingStatus, Severity } from "@prisma/client";
import { Icon } from "@/components/icons/Icon";
import { SevBadge } from "./SevBadge";
import { StatusPill } from "./StatusPill";
import { CvssBar } from "./CvssBar";
import type { FindingRow } from "./types";

type SeverityFilter = "ALL" | Severity;
type StatusFilter = "ALL" | FindingStatus;
type ToolFilter = "ALL" | string;
type FindingDisplayEntry =
  | { kind: "finding"; finding: FindingRow }
  | {
      kind: "target";
      key: string;
      target: string;
      toolName: string;
      findings: FindingRow[];
      maxSev: Severity;
    };
type AssociatedCve = {
  cveId: string;
  cvss: number | null | undefined;
  severity: Severity;
  description: string;
};

interface FindingsTableProps {
  rows: FindingRow[];
  selectedId: string | null;
  onSelect: (row: FindingRow) => void;
}

const SEVERITY_OPTIONS: SeverityFilter[] = [
  "ALL",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
];
const STATUS_OPTIONS: StatusFilter[] = ["ALL", "OPEN", "RESOLVED", "IGNORED"];
const MULTI_TARGET_DROPDOWN_TOOLS = new Set(["sirius", "vuls", "metlo"]);
const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
};

function relativeAge(d: Date): string {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

interface FilterRowProps<T extends string> {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}

function FilterRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: FilterRowProps<T>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.10em",
          color: "var(--ink-4)",
          textTransform: "uppercase",
          marginRight: 4,
        }}
      >
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className="nt-chip-opt"
          data-on={value === o}
          style={{ height: 24, fontSize: 11 }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function FindingsTable({
  rows,
  selectedId,
  onSelect,
}: FindingsTableProps) {
  const [sevFilter, setSevFilter] = useState<SeverityFilter>("ALL");
  const [toolFilter, setToolFilter] = useState<ToolFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [groupByTarget, setGroupByTarget] = useState(false);
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent row selection when clicking expand
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTarget = (e: React.MouseEvent, target: string) => {
    e.stopPropagation();
    setExpandedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });
  };

  const tools: ToolFilter[] = useMemo(
    () => ["ALL", ...Array.from(new Set(rows.map((r) => r.scanJob.toolName)))],
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => sevFilter === "ALL" || r.severity === sevFilter)
        .filter(
          (r) => toolFilter === "ALL" || r.scanJob.toolName === toolFilter,
        )
        .filter((r) => statusFilter === "ALL" || r.status === statusFilter),
    [rows, sevFilter, toolFilter, statusFilter],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, FindingRow[]>();
    for (const r of filtered) {
      if (!groups.has(r.target)) groups.set(r.target, []);
      groups.get(r.target)!.push(r);
    }
    return Array.from(groups.entries()).map(([target, findings]) => {
      let maxSev: Severity = "INFO";
      let maxScore = -1;
      for (const f of findings) {
        if (SEVERITY_RANK[f.severity] > maxScore) {
          maxScore = SEVERITY_RANK[f.severity];
          maxSev = f.severity;
        }
      }
      return { target, findings, maxSev };
    }).sort((a, b) => SEVERITY_RANK[b.maxSev] - SEVERITY_RANK[a.maxSev]);
  }, [filtered]);

  const defaultEntries = useMemo<FindingDisplayEntry[]>(() => {
    const targetsByScan = new Map<string, Set<string>>();

    for (const r of rows) {
      const toolName = r.scanJob.toolName.toLowerCase();
      if (!MULTI_TARGET_DROPDOWN_TOOLS.has(toolName)) continue;

      const scanKey = `${r.scanJobId}:${toolName}`;
      const targets = targetsByScan.get(scanKey) ?? new Set<string>();
      targets.add(r.target);
      targetsByScan.set(scanKey, targets);
    }

    const groups = new Map<
      string,
      Extract<FindingDisplayEntry, { kind: "target" }>
    >();

    for (const r of filtered) {
      const toolName = r.scanJob.toolName.toLowerCase();
      const scanKey = `${r.scanJobId}:${toolName}`;
      if (
        !MULTI_TARGET_DROPDOWN_TOOLS.has(toolName) ||
        (targetsByScan.get(scanKey)?.size ?? 0) < 2
      ) {
        continue;
      }

      const key = `${scanKey}:${r.target}`;
      const group = groups.get(key) ?? {
        kind: "target",
        key,
        target: r.target,
        toolName: r.scanJob.toolName,
        findings: [],
        maxSev: "INFO",
      };

      group.findings.push(r);
      if (SEVERITY_RANK[r.severity] > SEVERITY_RANK[group.maxSev]) {
        group.maxSev = r.severity;
      }
      groups.set(key, group);
    }

    const emitted = new Set<string>();
    const entries: FindingDisplayEntry[] = [];

    for (const r of filtered) {
      const key = `${r.scanJobId}:${r.scanJob.toolName.toLowerCase()}:${r.target}`;
      const group = groups.get(key);

      if (!group) {
        entries.push({ kind: "finding", finding: r });
        continue;
      }
      if (emitted.has(key)) {
        continue;
      }

      emitted.add(key);
      entries.push(group);
    }

    return entries;
  }, [filtered, rows]);

  const renderFindingRow = (r: FindingRow) => {
    const sel = r.id === selectedId;
    const isExpanded = expandedRows.has(r.id);
    const cves = (r.cves as unknown as AssociatedCve[] | null) ?? [];
    const hasCves = cves.length > 0;

    return (
      <Fragment key={r.id}>
        <tr
          onClick={() => onSelect(r)}
          style={{
            cursor: "pointer",
            background: sel ? "var(--nt-blue-50)" : "transparent",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <td
            style={{ padding: "10px 12px", textAlign: "center" }}
            onClick={(e) => hasCves && toggleExpand(e, r.id)}
          >
            {hasCves ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: isExpanded ? "var(--line)" : "transparent",
                  cursor: "pointer",
                  transition: "transform 0.2s",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                <Icon name="chevronRight" size={14} color="var(--ink-3)" />
              </div>
            ) : null}
          </td>
          <td style={{ padding: "10px 16px" }}>
            <SevBadge severity={r.severity} />
          </td>
          <td style={{ padding: "10px 12px" }}>
            <span
              style={{
                fontWeight: 600,
                color: "var(--ink)",
                display: "inline-block",
                maxWidth: 280,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                verticalAlign: "middle",
              }}
            >
              {r.title}
            </span>
          </td>
          <td style={{ padding: "10px 12px" }}>
            <CvssBar score={r.cvss} severity={r.severity} />
          </td>
          <td style={{ padding: "10px 12px" }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: "var(--ink-2)",
              }}
            >
              {r.scanJob.toolName}
            </span>
          </td>
          <td style={{ padding: "10px 12px" }}>
            <span
              className="mono"
              style={{ fontSize: 11, color: "var(--ink-2)" }}
            >
              {r.target}
            </span>
          </td>
          <td style={{ padding: "10px 12px" }}>
            <StatusPill status={r.status} />
          </td>
          <td
            style={{
              padding: "10px 16px",
              textAlign: "right",
            }}
          >
            <span
              suppressHydrationWarning
              className="mono"
              style={{ fontSize: 11, color: "var(--ink-3)" }}
            >
              {relativeAge(r.createdAt)}
            </span>
          </td>
        </tr>

        {isExpanded && hasCves && (
          <tr style={{ background: "var(--surface-2)" }}>
            <td colSpan={8} style={{ padding: 0, borderBottom: "1px solid var(--line)" }}>
              <div style={{ padding: "16px 24px 16px 64px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  Associated CVEs ({cves.length})
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--surface-1)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--line)" }}>
                  <tbody>
                    {cves.map((cve, i) => (
                      <tr key={i} style={{ borderBottom: i < cves.length - 1 ? "1px solid var(--line)" : "none" }}>
                        <td style={{ padding: "8px 12px", width: "160px" }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{cve.cveId}</span>
                        </td>
                        <td style={{ padding: "8px 12px", width: "120px" }}>
                          <SevBadge severity={cve.severity} />
                        </td>
                        <td style={{ padding: "8px 12px", width: "140px" }}>
                          <CvssBar score={cve.cvss} severity={cve.severity} />
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: 12.5, color: "var(--ink-2)", display: "block", maxWidth: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {cve.description}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  return (
    <div className="nt-card" style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "14px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Findings</div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--ink-3)",
                marginTop: 2,
              }}
            >
              <span className="mono tnum">{filtered.length}</span> of{" "}
              <span className="mono tnum">{rows.length}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.10em" }}>View Mode</span>
              <button type="button" onClick={() => setGroupByTarget(false)} className="nt-chip-opt" data-on={!groupByTarget} style={{height: 24, fontSize: 11}}>Flat List</button>
              <button type="button" onClick={() => setGroupByTarget(true)} className="nt-chip-opt" data-on={groupByTarget} style={{height: 24, fontSize: 11}}>Group by Target</button>
            </div>
            <div style={{ width: 1, height: 16, background: "var(--line)" }} />
            <button type="button" className="btn btn-sm" disabled>
              <Icon name="download" size={12} />
              Export
            </button>
          </div>
        </div>
        <FilterRow
          label="Severity"
          value={sevFilter}
          options={SEVERITY_OPTIONS}
          onChange={setSevFilter}
        />
        <FilterRow
          label="Tool"
          value={toolFilter}
          options={tools}
          onChange={setToolFilter}
        />
        <FilterRow
          label="Status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={setStatusFilter}
        />
      </div>

      <div style={{ height: 1, background: "var(--line)" }} />

      <div style={{ overflow: "auto", maxHeight: 560 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12.5,
          }}
        >
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
              <th style={{ width: 40, borderBottom: "1px solid var(--line)" }} />
              <th
                style={{
                  padding: "8px 16px",
                  textAlign: "left",
                  borderBottom: "1px solid var(--line)",
                  width: 100,
                }}
              >
                Severity
              </th>
              <th
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                Title
              </th>
              <th
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  borderBottom: "1px solid var(--line)",
                  width: 100,
                }}
              >
                CVSS
              </th>
              <th
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  borderBottom: "1px solid var(--line)",
                  width: 120,
                }}
              >
                Tool
              </th>
              <th
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  borderBottom: "1px solid var(--line)",
                  width: 160,
                }}
              >
                Target
              </th>
              <th
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  borderBottom: "1px solid var(--line)",
                  width: 90,
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: "8px 16px",
                  textAlign: "right",
                  borderBottom: "1px solid var(--line)",
                  width: 70,
                }}
              >
                Age
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "var(--ink-4)",
                    fontSize: 12.5,
                  }}
                >
                  No findings match the current filters.
                </td>
              </tr>
            )}
            {!groupByTarget ? (
              defaultEntries.map((entry) => {
                if (entry.kind === "finding") {
                  return renderFindingRow(entry.finding);
                }

                const isExpanded = expandedTargets.has(entry.key);
                return (
                  <Fragment key={entry.key}>
                    <tr
                      onClick={(e) => toggleTarget(e, entry.key)}
                      style={{
                        cursor: "pointer",
                        background: "var(--surface-2)",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            background: isExpanded ? "var(--line)" : "transparent",
                            transition: "transform 0.2s",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          }}
                        >
                          <Icon name="chevronRight" size={14} color="var(--ink-3)" />
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <SevBadge severity={entry.maxSev} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          className="mono"
                          style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}
                        >
                          {entry.target}
                        </span>
                        <span style={{ marginLeft: 10, fontSize: 11.5, color: "var(--ink-3)" }}>
                          {entry.findings.length} findings
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--ink-3)" }}>-</td>
                      <td style={{ padding: "10px 12px", color: "var(--ink-2)" }}>
                        {entry.toolName}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>
                          {entry.target}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--ink-3)" }}>-</td>
                      <td style={{ padding: "10px 16px" }} />
                    </tr>
                    {isExpanded && entry.findings.map(renderFindingRow)}
                  </Fragment>
                );
              })
            ) : (
              grouped.map(({ target, findings, maxSev }) => {
                const isExpanded = expandedTargets.has(target);
                return (
                  <Fragment key={target}>
                    <tr onClick={(e) => toggleTarget(e, target)} style={{ cursor: "pointer", background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            background: isExpanded ? "var(--line)" : "transparent",
                            transition: "transform 0.2s",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          }}
                        >
                          <Icon name="chevronRight" size={14} color="var(--ink-3)" />
                        </div>
                      </td>
                      <td colSpan={7} style={{ padding: "10px 16px" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{target}</span>
                          <SevBadge severity={maxSev} />
                          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{findings.length} findings</span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && findings.map(renderFindingRow)}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
