"use client";

import {
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { FindingStatus } from "@prisma/client";
import { Icon } from "@/components/icons/Icon";
import {
  getCvssMetricDetails,
  getPreferredDescription,
  getPrimaryToolCveDetail,
  getToolCveDetails,
} from "@/lib/findings/cve-details";
import { SevBadge } from "./SevBadge";
import { StatusPill } from "./StatusPill";
import type { FindingRow } from "./types";

interface FindingDrawerProps {
  finding: FindingRow;
  onClose: () => void;
}

type Tab = "description" | "remediation" | "status";

const TABS: { id: Tab; label: string; sparkle?: boolean }[] = [
  { id: "description", label: "Description" },
  { id: "remediation", label: "AI Remediation", sparkle: true },
  { id: "status", label: "Status" },
];

const STATUS_OPTIONS: FindingStatus[] = ["OPEN", "RESOLVED", "IGNORED"];
const DETAIL_TOOLS = new Set(["sirius", "vuls"]);
type FindingDetailOverride = Pick<
  FindingRow,
  "description" | "remediation" | "cvss" | "cves"
> & { id: string };

const METRIC_COLORS: Record<"blue" | "green" | "amber" | "red", string> = {
  blue: "var(--nt-blue)",
  green: "var(--ok)",
  amber: "#EAB308",
  red: "var(--err)",
};

function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function metricTone(value: string): keyof typeof METRIC_COLORS {
  const normalized = value.toUpperCase();
  if (["HIGH", "NETWORK", "NONE", "CHANGED"].includes(normalized)) return "red";
  if (["LOW", "PARTIAL", "LOCAL", "REQUIRED"].includes(normalized)) return "amber";
  if (["UNCHANGED", "PHYSICAL"].includes(normalized)) return "green";
  return "blue";
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: keyof typeof METRIC_COLORS;
}) {
  const color = METRIC_COLORS[tone ?? metricTone(value)];
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: `color-mix(in oklab, ${color} 8%, var(--surface-2))`,
        border: `1px solid color-mix(in oklab, ${color} 34%, var(--line))`,
        minHeight: 54,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.10em",
          color: "var(--ink-4)",
          textTransform: "uppercase",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          color,
          fontSize: 12.5,
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailHeading({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: "var(--ink-4)",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function InfoGrid({
  rows,
}: {
  rows: Array<{ label: string; value: string | number | undefined }>;
}) {
  const visibleRows = rows.filter((row) => row.value !== undefined && row.value !== "");
  if (visibleRows.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {visibleRows.map((row) => (
        <div
          key={row.label}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            minHeight: 54,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.10em",
              color: "var(--ink-4)",
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            {row.label}
          </div>
          <div
            className="mono"
            style={{
              color: "var(--ink-2)",
              fontSize: 12,
              fontWeight: 700,
              wordBreak: "break-word",
            }}
          >
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailBlock({
  title,
  children,
  mono = false,
}: {
  title: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <DetailHeading>{title}</DetailHeading>
      <div
        className={mono ? "mono" : undefined}
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          color: "var(--ink-2)",
          fontSize: mono ? 11.5 : 12.5,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function FindingDrawer({ finding, onClose }: FindingDrawerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("description");
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    finding.status,
    (_prev, next: FindingStatus) => next,
  );
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detailOverride, setDetailOverride] =
    useState<FindingDetailOverride | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const displayFinding =
    detailOverride?.id === finding.id
      ? { ...finding, ...detailOverride }
      : finding;
  const toolKey = displayFinding.scanJob.toolName.toLowerCase();
  const showRichDetails = DETAIL_TOOLS.has(toolKey);
  const cveDetails = showRichDetails ? getToolCveDetails(displayFinding) : [];
  const primaryDetail = showRichDetails ? getPrimaryToolCveDetail(displayFinding) : null;
  const cvssMetrics = getCvssMetricDetails(primaryDetail);
  const displayDescription = showRichDetails
    ? getPreferredDescription(displayFinding, displayFinding.scanJob.toolName)
    : displayFinding.description;
  const showSiriusMetrics = toolKey === "sirius";
  const showVulsDetails = toolKey === "vuls";
  const attackSurface = [
    { label: "Vector", value: cvssMetrics.attackVector },
    { label: "Complexity", value: cvssMetrics.attackComplexity },
    { label: "Privileges", value: cvssMetrics.privilegesRequired },
    { label: "User Int.", value: cvssMetrics.userInteraction },
    { label: "Scope", value: cvssMetrics.scope },
  ].filter((item): item is { label: string; value: string } => hasValue(item.value));
  const ciaImpact = [
    { label: "Confidentiality", value: cvssMetrics.confidentiality },
    { label: "Integrity", value: cvssMetrics.integrity },
    { label: "Availability", value: cvssMetrics.availability },
  ].filter((item): item is { label: string; value: string } => hasValue(item.value));
  const associatedCves = Array.from(
    new Set(cveDetails.map((detail) => detail.cveId).filter(hasValue)),
  );
  const references = Array.from(
    new Set([
      ...(primaryDetail?.primarySource ? [primaryDetail.primarySource] : []),
      ...(primaryDetail?.references ?? []),
    ]),
  );
  const vulsMitigation =
    primaryDetail?.mitigation ??
    primaryDetail?.remediation ??
    displayFinding.remediation;

  useEffect(() => {
    const currentToolKey = finding.scanJob.toolName.toLowerCase();
    if (!DETAIL_TOOLS.has(currentToolKey)) {
      setDetailOverride(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    fetch(`/api/findings/${finding.id}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json().catch(() => null)) as
          | { finding?: FindingDetailOverride }
          | null;
      })
      .then((body) => {
        if (cancelled || !body?.finding) return;
        setDetailOverride(body.finding);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [finding.id, finding.scanJob.toolName]);

  function changeStatus(next: FindingStatus) {
    if (next === optimisticStatus || pending) return;
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      const res = await fetch(`/api/findings/${finding.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setErrorMsg(body?.error ?? `update failed (${res.status})`);
        // Throw inside the transition so useOptimistic auto-reverts.
        throw new Error("revert");
      }
      router.refresh();
    });
  }

  return (
    <>
      <div
        className="nt-fade-in"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10,22,40,0.34)",
          backdropFilter: "blur(2px)",
          zIndex: 100,
        }}
      />
      <aside
        className="nt-slide-right"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(580px, 92vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "-12px 0 40px rgba(10,22,40,0.18)",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <SevBadge severity={displayFinding.severity} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              {displayFinding.title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                marginTop: 4,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span className="mono">{displayFinding.id.slice(-8)}</span>
              <span>·</span>
              <span>{displayFinding.scanJob.toolName}</span>
              <span>·</span>
              <span className="mono">{displayFinding.target}</span>
              {displayFinding.cvss != null && (
                <>
                  <span>·</span>
                  <span className="mono">CVSS {displayFinding.cvss.toFixed(1)}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              border: 0,
              background: "transparent",
              color: "var(--ink-3)",
              cursor: "pointer",
              borderRadius: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div
          style={{
            padding: "0 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            gap: 0,
            overflowX: "auto",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                border: 0,
                background: "transparent",
                padding: "12px 14px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: tab === t.id ? 600 : 500,
                color: tab === t.id ? "var(--nt-blue)" : "var(--ink-3)",
                borderBottom: `2px solid ${tab === t.id ? "var(--nt-blue)" : "transparent"}`,
                marginBottom: -1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {t.sparkle && <Icon name="sparkles" size={12} />}
              {t.label}
            </button>
          ))}
        </div>

        <div
          style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}
          key={tab}
        >
          <div className="nt-fade-in">
            {tab === "description" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {(!showVulsDetails || !primaryDetail) && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {displayDescription || "-- no description provided --"}
                  </div>
                )}

                {showRichDetails && detailLoading && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      color: "var(--ink-3)",
                      fontSize: 11.5,
                    }}
                  >
                    Loading CVE details...
                  </div>
                )}

                {showSiriusMetrics && attackSurface.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <DetailHeading>Attack Surface</DetailHeading>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      {attackSurface.map((item) => (
                        <MetricTile
                          key={item.label}
                          label={item.label}
                          value={item.value}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showSiriusMetrics && ciaImpact.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <DetailHeading>CIA Impact</DetailHeading>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      {ciaImpact.map((item) => (
                        <MetricTile
                          key={item.label}
                          label={item.label}
                          value={item.value}
                          tone={metricTone(item.value)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showVulsDetails && primaryDetail && (
                  <>
                    {associatedCves.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <DetailHeading>Associated CVEs</DetailHeading>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {associatedCves.map((cve) => (
                            <span
                              key={cve}
                              className="mono"
                              style={{
                                padding: "6px 8px",
                                borderRadius: 6,
                                background: "var(--surface-2)",
                                border: "1px solid var(--line)",
                                color: "var(--ink-2)",
                                fontSize: 11.5,
                                fontWeight: 700,
                              }}
                            >
                              {cve}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <DetailHeading>CVSS Scores</DetailHeading>
                      <InfoGrid
                        rows={[
                          { label: "Score", value: primaryDetail.cvss ?? displayFinding.cvss ?? undefined },
                          { label: "Severity", value: primaryDetail.nativeSeverity ?? primaryDetail.severity },
                          { label: "Source", value: primaryDetail.severitySource },
                          { label: "CVSS vector", value: primaryDetail.cvssVector },
                        ]}
                      />
                    </div>

                    <DetailBlock title="Summary">
                      {displayDescription || "-- no summary provided --"}
                    </DetailBlock>

                    {vulsMitigation && (
                      <DetailBlock title="Mitigation">
                        {vulsMitigation}
                      </DetailBlock>
                    )}

                    {primaryDetail.affectedPackages && primaryDetail.affectedPackages.length > 0 && (
                      <DetailBlock title="Affected Packages, Processes" mono>
                        {primaryDetail.affectedPackages.join("\n")}
                      </DetailBlock>
                    )}

                    {references.length > 0 && (
                      <DetailBlock title="Primary Src" mono>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {references.map((ref) => {
                            const isUrl = /^https?:\/\//i.test(ref);
                            return isUrl ? (
                              <a
                                key={ref}
                                href={ref}
                                target="_blank"
                                rel="noreferrer"
                                className="mono"
                                style={{
                                  color: "var(--nt-blue)",
                                  fontSize: 11.5,
                                  wordBreak: "break-all",
                                }}
                              >
                                {ref}
                              </a>
                            ) : (
                              <span
                                key={ref}
                                className="mono"
                                style={{
                                  color: "var(--ink-2)",
                                  fontSize: 11.5,
                                  wordBreak: "break-all",
                                }}
                              >
                                {ref}
                              </span>
                            );
                          })}
                        </div>
                      </DetailBlock>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === "remediation" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {displayFinding.remediation ? (
                  <>
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background:
                          "linear-gradient(135deg, color-mix(in oklab, var(--nt-blue) 8%, var(--surface)) 0%, var(--surface) 100%)",
                        border:
                          "1px solid color-mix(in oklab, var(--nt-blue) 25%, var(--line))",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background:
                            "linear-gradient(135deg, var(--nt-blue), var(--nt-cyan))",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name="sparkles" size={14} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          AI-suggested remediation
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: "var(--ink-3)",
                          }}
                        >
                          generated by configured project AI provider
                        </div>
                      </div>
                    </div>
                    <ol
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {displayFinding.remediation
                        .split("\n")
                        .filter(Boolean)
                        .map((step, i) => {
                          const m = step.match(/^(\d+)\.\s*(.*)$/);
                          const n = m ? m[1] : i + 1;
                          const txt = m ? m[2] : step;
                          return (
                            <li
                              key={i}
                              style={{
                                display: "flex",
                                gap: 10,
                                padding: "10px 12px",
                                background: "var(--surface-2)",
                                border: "1px solid var(--line)",
                                borderRadius: 8,
                              }}
                            >
                              <span
                                style={{
                                  flexShrink: 0,
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  background: "var(--nt-blue-50)",
                                  color: "var(--nt-blue)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                {n}
                              </span>
                              <span
                                style={{
                                  fontSize: 12.5,
                                  lineHeight: 1.55,
                                  color: "var(--ink-2)",
                                }}
                              >
                                {txt}
                              </span>
                            </li>
                          );
                        })}
                    </ol>
                  </>
                ) : (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      fontSize: 12.5,
                      color: "var(--ink-3)",
                      background: "var(--surface-2)",
                      border: "1px dashed var(--line)",
                      borderRadius: 8,
                    }}
                  >
                    No remediation steps were ingested for this finding.
                  </div>
                )}
              </div>
            )}

            {tab === "status" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                  }}
                >
                  First seen{" "}
                  <span className="mono" style={{ color: "var(--ink-2)" }}>
                    {new Date(finding.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Update status
                  </div>
                  {errorMsg && (
                    <div
                      role="alert"
                      style={{
                        fontSize: 11.5,
                        color: "var(--err)",
                        background: "rgba(239,68,68,0.10)",
                        border: "1px solid rgba(239,68,68,0.18)",
                        padding: "8px 10px",
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      {errorMsg}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => {
                      const checked = optimisticStatus === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => changeStatus(s)}
                          disabled={pending}
                          aria-pressed={checked}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            background: checked
                              ? "var(--nt-blue-50)"
                              : "var(--surface-2)",
                            border: `1px solid ${checked ? "var(--nt-blue)" : "var(--line)"}`,
                            borderRadius: 8,
                            cursor: pending ? "wait" : "pointer",
                            textAlign: "left",
                            font: "inherit",
                            transition: "all 140ms ease",
                            opacity: pending && !checked ? 0.6 : 1,
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              border: `2px solid ${checked ? "var(--nt-blue)" : "var(--line-2)"}`,
                              background: checked
                                ? "var(--nt-blue)"
                                : "transparent",
                              boxShadow: checked
                                ? "inset 0 0 0 3px var(--surface)"
                                : "none",
                              flexShrink: 0,
                            }}
                          />
                          <StatusPill status={s} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
