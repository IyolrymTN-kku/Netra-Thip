"use client";

import React, { forwardRef, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PDF_PAGE_HEIGHT_PX, PDF_PAGE_WIDTH_PX } from "./pdfLayout";
import { SEVERITY_KEYS, type ReportExportData, type ReportFinding } from "./types";

interface PdfToolReportProps {
  data: ReportExportData;
}

const SEV_COLORS: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: "#E11D48", text: "#FFF" },
  HIGH:     { bg: "#F97316", text: "#FFF" },
  MEDIUM:   { bg: "#EAB308", text: "#FFF" },
  LOW:      { bg: "#0066FF", text: "#FFF" },
  INFO:     { bg: "#64748B", text: "#FFF" },
};

function getRiskLabel(score: number) {
  if (score >= 70) return "CRITICAL";
  if (score >= 40) return "HIGH";
  if (score >= 15) return "MEDIUM";
  if (score > 0)   return "LOW";
  return "NONE";
}

function getRiskColor(score: number) {
  if (score >= 70) return "#E11D48";
  if (score >= 40) return "#F97316";
  if (score >= 15) return "#EAB308";
  return "#10B981";
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function scanDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "N/A";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

function formatCves(cves: unknown): string {
  if (!Array.isArray(cves)) return "";

  return cves
    .map((cve) => {
      if (cve && typeof cve === "object" && "cveId" in cve) {
        const cveId = (cve as { cveId?: unknown }).cveId;
        return cveId ? String(cveId) : "";
      }
      return String(cve);
    })
    .filter(Boolean)
    .join(", ");
}

interface ToolReportProfile {
  reportTitle: string;
  summaryReportName: string;
  assessmentName: string;
  targetLabel: string;
  targetSingular: string;
  targetPlural: string;
  recommendationSubject: string;
}

const DEFAULT_TOOL_REPORT_PROFILE: ToolReportProfile = {
  reportTitle: "PENETRATION TESTING REPORT",
  summaryReportName: "penetration testing report",
  assessmentName: "automated penetration testing assessment",
  targetLabel: "Target System",
  targetSingular: "target system",
  targetPlural: "target systems",
  recommendationSubject: "target system",
};

const TOOL_REPORT_PROFILES: Record<string, ToolReportProfile> = {
  vuls: {
    reportTitle: "VULNERABILITY ASSESSMENT REPORT",
    summaryReportName: "vulnerability assessment report",
    assessmentName: "automated vulnerability assessment",
    targetLabel: "Target Host",
    targetSingular: "target host",
    targetPlural: "target hosts",
    recommendationSubject: "assessed hosts",
  },
  sirius: {
    reportTitle: "NETWORK VULNERABILITY SCAN REPORT",
    summaryReportName: "network vulnerability scan report",
    assessmentName: "network vulnerability assessment",
    targetLabel: "Network Target",
    targetSingular: "network target",
    targetPlural: "network targets",
    recommendationSubject: "network attack surface",
  },
  metlo: {
    reportTitle: "API SECURITY REPORT",
    summaryReportName: "API security report",
    assessmentName: "API security assessment",
    targetLabel: "API Surface",
    targetSingular: "API endpoint",
    targetPlural: "API endpoints",
    recommendationSubject: "API surface",
  },
};

function getToolReportProfile(toolName: string): ToolReportProfile {
  const normalized = toolName.toLowerCase();

  if (normalized.includes("vuls")) return TOOL_REPORT_PROFILES.vuls;
  if (normalized.includes("sirius")) return TOOL_REPORT_PROFILES.sirius;
  if (normalized.includes("metlo")) return TOOL_REPORT_PROFILES.metlo;

  return DEFAULT_TOOL_REPORT_PROFILE;
}

interface IndexedFinding {
  finding: ReportFinding;
  index: number;
}

interface RecommendationItem {
  finding: ReportFinding;
  index: number;
}

const TOOL_PAGE_PADDING_X = 44;
const TOOL_PAGE_PADDING_Y = 36;
const TOOL_PAGE_CONTENT_HEIGHT = PDF_PAGE_HEIGHT_PX - TOOL_PAGE_PADDING_Y * 2;
const SECTION_HEADING_HEIGHT = 78;
const PAGE_BOTTOM_BUFFER = 36;
const VULNERABILITY_TABLE_HEADER_HEIGHT = 44;
const VULNERABILITY_TABLE_AVAILABLE_HEIGHT =
  TOOL_PAGE_CONTENT_HEIGHT - SECTION_HEADING_HEIGHT - VULNERABILITY_TABLE_HEADER_HEIGHT - PAGE_BOTTOM_BUFFER;
const DETAILED_FINDINGS_AVAILABLE_HEIGHT =
  TOOL_PAGE_CONTENT_HEIGHT - SECTION_HEADING_HEIGHT - PAGE_BOTTOM_BUFFER;
const RECOMMENDATIONS_AVAILABLE_HEIGHT =
  TOOL_PAGE_CONTENT_HEIGHT - SECTION_HEADING_HEIGHT - 86 - PAGE_BOTTOM_BUFFER;
const DETAILED_FINDING_CARD_GAP = 28;
const MAX_DETAILED_FINDINGS_PER_PAGE = 3;
const MAX_RECOMMENDATIONS_PER_PAGE = 8;

function estimateLineCount(text: string | null | undefined, charsPerLine: number): number {
  const value = (text || "").trim();
  if (!value) return 1;

  return value
    .split(/\r?\n/)
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

function chunkByEstimatedHeight<T>(
  items: T[],
  maxHeight: number,
  estimateHeight: (item: T) => number,
  maxItemsPerPage?: number,
): T[][] {
  const pages: T[][] = [];
  let page: T[] = [];
  let pageHeight = 0;

  for (const item of items) {
    const itemHeight = estimateHeight(item);
    const exceedsHeight = page.length > 0 && pageHeight + itemHeight > maxHeight;
    const exceedsCount = Boolean(maxItemsPerPage && page.length >= maxItemsPerPage);

    if (exceedsHeight || exceedsCount) {
      pages.push(page);
      page = [];
      pageHeight = 0;
    }

    page.push(item);
    pageHeight += itemHeight;
  }

  if (page.length > 0) pages.push(page);
  return pages;
}

function chunkByMeasuredHeight<T>(items: T[], heights: number[], maxHeight: number, itemGap = 0): T[][] {
  const pages: T[][] = [];
  let page: T[] = [];
  let pageHeight = 0;

  items.forEach((item, index) => {
    const itemHeight = Math.ceil(heights[index] || maxHeight) + itemGap;
    const exceedsHeight = page.length > 0 && pageHeight + itemHeight > maxHeight;

    if (exceedsHeight) {
      pages.push(page);
      page = [];
      pageHeight = 0;
    }

    page.push(item);
    pageHeight += itemHeight;
  });

  if (page.length > 0) pages.push(page);
  return pages;
}

function estimateVulnerabilityRowHeight({ finding }: IndexedFinding): number {
  const titleLines = estimateLineCount(finding.title, 42);
  const targetLines = estimateLineCount(finding.target, 24);
  return 38 + (Math.max(titleLines, targetLines) - 1) * 16;
}

function estimateDetailedFindingHeight({ finding }: IndexedFinding): number {
  const cves = formatCves(finding.cves);
  const cveHeight = cves ? estimateLineCount(cves, 74) * 16 : 0;

  return (
    154 +
    estimateLineCount(finding.title, 58) * 18 +
    cveHeight +
    estimateLineCount(finding.description || "No description provided.", 84) * 20 +
    estimateLineCount(finding.remediation || "No remediation guidance provided.", 84) * 20
  );
}

function estimateRecommendationHeight({ finding }: RecommendationItem): number {
  const firstLine = (finding.remediation || "Review and remediate.").split("\n")[0].slice(0, 180);

  return (
    46 +
    estimateLineCount(finding.title, 68) * 17 +
    estimateLineCount(firstLine, 84) * 18
  );
}

// ── Styles ──
const S = {
  page: {
    width: `${PDF_PAGE_WIDTH_PX}px`,
    backgroundColor: "#FFFFFF",
    color: "#0A1628",
    fontFamily: "'Inter', 'Segoe UI', ui-sans-serif, system-ui, sans-serif",
    fontSize: "13px",
    lineHeight: "1.65",
    padding: "0",
    boxSizing: "border-box" as const,
  },
  section: {
    width: `${PDF_PAGE_WIDTH_PX}px`,
    minHeight: `${PDF_PAGE_HEIGHT_PX}px`,
    padding: `${TOOL_PAGE_PADDING_Y}px ${TOOL_PAGE_PADDING_X}px`,
    pageBreakBefore: "always" as const,
    backgroundColor: "#FFFFFF",
    boxSizing: "border-box" as const,
    overflow: "visible" as const,
  },
  firstSection: { padding: `${TOOL_PAGE_PADDING_Y}px ${TOOL_PAGE_PADDING_X}px` },
  h2: {
    fontSize: "22px",
    fontWeight: 800,
    borderBottom: "3px solid #0066FF",
    paddingBottom: "10px",
    marginBottom: "22px",
    marginTop: "0",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  h3: { fontSize: "16px", fontWeight: 700, marginBottom: "12px", marginTop: "24px" },
  table: { width: "100%", borderCollapse: "collapse" as const, tableLayout: "fixed" as const, fontSize: "12px", marginBottom: "20px" },
  th: { padding: "10px 12px", textAlign: "left" as const, backgroundColor: "#F1F5F9", borderBottom: "2px solid #CBD5E1", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#475569" },
  td: { padding: "9px 12px", borderBottom: "1px solid #E5E9F0", verticalAlign: "top" as const, wordBreak: "break-word" as const },
  numberTh: {
    padding: "10px 10px",
    width: "44px",
    minWidth: "44px",
    whiteSpace: "nowrap" as const,
    wordBreak: "normal" as const,
  },
  numberTd: {
    padding: "9px 10px",
    width: "44px",
    minWidth: "44px",
    whiteSpace: "nowrap" as const,
    wordBreak: "normal" as const,
    overflowWrap: "normal" as const,
  },
  badge: (sev: string) => ({
    display: "inline-block",
    backgroundColor: SEV_COLORS[sev]?.bg || "#64748B",
    color: "#FFF",
    padding: "3px 10px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.5px",
  }),
  cardRow: { display: "flex", gap: "16px", marginBottom: "24px" },
  card: { flex: 1, padding: "20px", backgroundColor: "#F8FAFC", borderRadius: "8px", border: "1px solid #E5E9F0", textAlign: "center" as const },
  cardLabel: { fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: "8px" },
  cardValue: { fontSize: "32px", fontWeight: 800, margin: "0" },
  confidential: { color: "#E11D48", fontWeight: 700, fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase" as const },
  measureArea: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: `${PDF_PAGE_WIDTH_PX - TOOL_PAGE_PADDING_X * 2}px`,
    visibility: "hidden" as const,
    pointerEvents: "none" as const,
    zIndex: -1,
  },
};

function DetailedFindingCard({ item }: { item: IndexedFinding }) {
  const { finding: f, index } = item;
  const cves = formatCves(f.cves);

  return (
    <div
      data-pdf-avoid-break="true"
      data-pdf-finding-card="true"
      style={{
        marginBottom: `${DETAILED_FINDING_CARD_GAP}px`,
        border: "1px solid #D9DEE8",
        borderRadius: "8px",
        breakInside: "avoid",
        pageBreakInside: "avoid",
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "14px 18px",
        backgroundColor: "#F1F5F9",
        borderBottom: "1px solid #D9DEE8",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
      }}>
        <span style={{ fontWeight: 800, fontSize: "14px", lineHeight: "1.45" }}>
          {index + 1}. {f.title}
        </span>
        <span style={{ ...S.badge(f.severity), flex: "0 0 auto" }}>{f.severity}</span>
      </div>

      <div style={{ padding: "18px" }}>
        <table style={{ ...S.table, marginBottom: "14px", fontSize: "12px" }}>
          <tbody>
            <tr><td style={{ width: "100px", fontWeight: 600, color: "#64748B", padding: "4px 0" }}>Target:</td><td style={{ padding: "4px 0", fontFamily: "monospace" }}>{f.target}</td></tr>
            <tr><td style={{ fontWeight: 600, color: "#64748B", padding: "4px 0" }}>CVSS:</td><td style={{ padding: "4px 0" }}>{f.cvss ?? "N/A"}</td></tr>
            <tr><td style={{ fontWeight: 600, color: "#64748B", padding: "4px 0" }}>Status:</td><td style={{ padding: "4px 0" }}>{f.status}</td></tr>
            {cves && (
              <tr><td style={{ fontWeight: 600, color: "#64748B", padding: "4px 0" }}>CVEs:</td><td style={{ padding: "4px 0", fontFamily: "monospace", fontSize: "11px" }}>{cves}</td></tr>
            )}
          </tbody>
        </table>

        <div data-pdf-avoid-break="true">
          <h4 style={{ fontSize: "12px", fontWeight: 800, color: "#0066FF", margin: "12px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</h4>
          <div style={{ whiteSpace: "pre-wrap", fontSize: "12px", color: "#334155", lineHeight: "1.7" }}>
            {f.description || "No description provided."}
          </div>
        </div>

        <div data-pdf-avoid-break="true">
          <h4 style={{ fontSize: "12px", fontWeight: 800, color: "#10B981", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Remediation</h4>
          <div style={{ whiteSpace: "pre-wrap", fontSize: "12px", color: "#334155", lineHeight: "1.7" }}>
            {f.remediation || "No remediation guidance provided."}
          </div>
        </div>
      </div>
    </div>
  );
}

function VulnerabilityTableRow({ item }: { item: IndexedFinding }) {
  const { finding: f, index } = item;

  return (
    <tr key={f.id} data-pdf-avoid-break="true" data-pdf-vulnerability-row="true">
      <td style={{ ...S.td, ...S.numberTd, color: "#94A3B8" }}>{index + 1}</td>
      <td style={{ ...S.td, fontWeight: 600 }}>{f.title}</td>
      <td style={S.td}><span style={S.badge(f.severity)}>{f.severity}</span></td>
      <td style={{ ...S.td, fontFamily: "monospace", fontSize: "11px" }}>{f.target}</td>
      <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{f.cvss ?? "-"}</td>
    </tr>
  );
}

function VulnerabilityTableHead() {
  return (
    <thead>
      <tr>
        <th style={{ ...S.th, ...S.numberTh }}>#</th>
        <th style={S.th}>Vulnerability</th>
        <th style={{ ...S.th, width: "90px" }}>Severity</th>
        <th style={S.th}>Target</th>
        <th style={{ ...S.th, width: "50px", textAlign: "right" }}>CVSS</th>
      </tr>
    </thead>
  );
}

export const PdfToolReport = forwardRef<HTMLDivElement, PdfToolReportProps>(
  ({ data }, ref) => {
    const { project, scanJobInfo, findings, kpi, compliance } = data;
    const indexedFindings = useMemo(
      () => findings.map((finding, index) => ({ finding, index })),
      [findings],
    );
    const estimatedDetailedFindingPages = useMemo(
      () => findings.length > 0
        ? chunkByEstimatedHeight(
            indexedFindings,
            DETAILED_FINDINGS_AVAILABLE_HEIGHT,
            estimateDetailedFindingHeight,
            MAX_DETAILED_FINDINGS_PER_PAGE,
          )
        : [],
      [findings.length, indexedFindings],
    );
    const estimatedVulnerabilityPages = useMemo(
      () => findings.length > 0
        ? chunkByEstimatedHeight(
            indexedFindings,
            VULNERABILITY_TABLE_AVAILABLE_HEIGHT,
            estimateVulnerabilityRowHeight,
          )
        : [],
      [findings.length, indexedFindings],
    );
    const detailedMeasureRef = useRef<HTMLDivElement>(null);
    const [measuredDetailedFindingPages, setMeasuredDetailedFindingPages] = useState<IndexedFinding[][] | null>(null);
    const [measuredVulnerabilityPages, setMeasuredVulnerabilityPages] = useState<IndexedFinding[][] | null>(null);

    useLayoutEffect(() => {
      if (indexedFindings.length === 0) {
        setMeasuredDetailedFindingPages([]);
        setMeasuredVulnerabilityPages([]);
        return;
      }

      const measurementArea = detailedMeasureRef.current;
      if (!measurementArea) return;

      const cards = Array.from(measurementArea.querySelectorAll<HTMLElement>("[data-pdf-finding-card='true']"));
      const rows = Array.from(measurementArea.querySelectorAll<HTMLElement>("[data-pdf-vulnerability-row='true']"));
      if (cards.length !== indexedFindings.length || rows.length !== indexedFindings.length) return;

      setMeasuredDetailedFindingPages(
        chunkByMeasuredHeight(
          indexedFindings,
          cards.map((card) => card.getBoundingClientRect().height),
          DETAILED_FINDINGS_AVAILABLE_HEIGHT,
          DETAILED_FINDING_CARD_GAP,
        ),
      );
      setMeasuredVulnerabilityPages(
        chunkByMeasuredHeight(
          indexedFindings,
          rows.map((row) => row.getBoundingClientRect().height),
          VULNERABILITY_TABLE_AVAILABLE_HEIGHT,
        ),
      );
    }, [indexedFindings]);

    if (!scanJobInfo) return null;

    const reportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const riskLabel = getRiskLabel(kpi.riskScore);
    const riskColor = getRiskColor(kpi.riskScore);
    const targets = [...new Set(findings.map((f) => f.target))];
    const reportProfile = getToolReportProfile(scanJobInfo.toolName);
    const targetList = targets.join(", ") || "N/A";
    const targetSubject = targets.length > 1 ? reportProfile.targetPlural : reportProfile.targetSingular;
    const targetScope = targets.length > 1 ? "assessed scope" : reportProfile.targetSingular;
    const vulnerabilityPages = measuredVulnerabilityPages ?? estimatedVulnerabilityPages;
    const detailedFindingPages = measuredDetailedFindingPages ?? estimatedDetailedFindingPages;
    const isPaginationReady = findings.length === 0 || (measuredDetailedFindingPages !== null && measuredVulnerabilityPages !== null);
    const recommendationItems = SEVERITY_KEYS
      .filter((sev) => sev !== "INFO")
      .flatMap((sev) => indexedFindings.filter(({ finding }) => finding.severity === sev && finding.status !== "RESOLVED"));
    const recommendationPages = recommendationItems.length > 0
      ? chunkByEstimatedHeight(
          recommendationItems,
          RECOMMENDATIONS_AVAILABLE_HEIGHT,
          estimateRecommendationHeight,
          MAX_RECOMMENDATIONS_PER_PAGE,
        )
      : [];

    return (
      <div ref={ref} style={{ ...S.page, position: "relative" }} data-pdf-ready={isPaginationReady ? "true" : "false"}>
        {findings.length > 0 && (
          <div ref={detailedMeasureRef} style={S.measureArea} aria-hidden="true">
            <table style={S.table}>
              <VulnerabilityTableHead />
              <tbody>
                {indexedFindings.map((item) => (
                  <VulnerabilityTableRow key={`measure-row-${item.finding.id}`} item={item} />
                ))}
              </tbody>
            </table>
            {indexedFindings.map((item) => (
              <DetailedFindingCard key={`measure-${item.finding.id}`} item={item} />
            ))}
          </div>
        )}

        {/* ════════════ PAGE 1: COVER ════════════ */}
        <div data-pdf-page="true" style={{
          ...S.section,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "60px",
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        }}>
          <div style={{ marginBottom: "60px" }}>
            <h1 style={{ fontSize: "42px", fontWeight: 900, color: "#0066FF", margin: "0 0 8px 0", letterSpacing: "-1px" }}>
              NETRA-THIP
            </h1>
            <div style={{ fontSize: "14px", color: "#64748B", fontWeight: 600, letterSpacing: "4px", textTransform: "uppercase" }}>
              Security Assessment Platform
            </div>
          </div>

          <div style={{
            fontSize: "28px",
            fontWeight: 800,
            marginBottom: "10px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}>
            {reportProfile.reportTitle}
          </div>

          <div style={{
            padding: "30px 40px",
            border: "2px solid #E5E9F0",
            borderRadius: "12px",
            width: "80%",
            margin: "30px 0",
            textAlign: "left",
          }}>
            <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
              <tbody>
                <tr><td style={{ padding: "8px 0", fontWeight: 600, color: "#64748B", width: "140px" }}>Tool:</td><td style={{ padding: "8px 0", fontWeight: 700 }}>{scanJobInfo.toolName}</td></tr>
                <tr><td style={{ padding: "8px 0", fontWeight: 600, color: "#64748B" }}>{reportProfile.targetLabel}:</td><td style={{ padding: "8px 0", fontWeight: 700 }}>{targetList}</td></tr>
                <tr><td style={{ padding: "8px 0", fontWeight: 600, color: "#64748B" }}>Scan ID:</td><td style={{ padding: "8px 0", fontFamily: "monospace", fontSize: "12px" }}>{scanJobInfo.id}</td></tr>
                <tr><td style={{ padding: "8px 0", fontWeight: 600, color: "#64748B" }}>Report Date:</td><td style={{ padding: "8px 0" }}>{reportDate}</td></tr>
                <tr><td style={{ padding: "8px 0", fontWeight: 600, color: "#64748B" }}>Assessor:</td><td style={{ padding: "8px 0" }}>{project.assessorName}</td></tr>
                <tr><td style={{ padding: "8px 0", fontWeight: 600, color: "#64748B" }}>Project:</td><td style={{ padding: "8px 0" }}>{project.name}</td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "auto" }}>
            <p style={S.confidential}>CONFIDENTIAL</p>
            <p style={{ fontSize: "11px", color: "#94A3B8", maxWidth: "400px", lineHeight: "1.5" }}>
              This report contains sensitive security information.<br />
              Handle with appropriate care and restrict distribution.
            </p>
          </div>
        </div>

        {/* ════════════ PAGE 2: EXECUTIVE SUMMARY ════════════ */}
        <div data-pdf-page="true" style={S.section}>
          <h2 style={S.h2}>Executive Summary</h2>

          <p>
            This {reportProfile.summaryReportName} presents the findings of a security assessment conducted
            on the {targetSubject} <strong>{targetList}</strong> using
            the <strong>{scanJobInfo.toolName}</strong> tool. The assessment was performed
            on <strong>{formatDate(scanJobInfo.startedAt || scanJobInfo.createdAt)}</strong> as part
            of the <strong>{project.name}</strong> project.
          </p>

          {/* Risk callout */}
          <div style={{
            padding: "16px 24px",
            backgroundColor: `${riskColor}10`,
            border: `2px solid ${riskColor}`,
            borderRadius: "8px",
            marginTop: "16px",
            marginBottom: "24px",
          }}>
            <p style={{ margin: 0, fontSize: "14px" }}>
              <strong style={{ color: riskColor }}>⚠ {riskLabel} RISK:</strong>{" "}
              {kpi.riskScore >= 40
                ? `The ${targetScope} exhibits significant risk. Immediate remediation action is required to address identified security vulnerabilities.`
                : kpi.riskScore >= 15
                  ? `The ${targetScope} shows moderate risk. Remediation should be prioritized based on severity levels.`
                  : kpi.riskScore > 0
                    ? `The ${targetScope} shows low risk. Identified issues should be addressed in regular maintenance cycles.`
                    : "No outstanding vulnerabilities detected. Continue regular security monitoring."}
            </p>
          </div>

          {/* KPI cards */}
          <div style={S.cardRow}>
            <div style={S.card}>
              <p style={S.cardLabel}>Overall Risk Level</p>
              <p style={{ ...S.cardValue, color: riskColor }}>{riskLabel}</p>
            </div>
            <div style={S.card}>
              <p style={S.cardLabel}>Total Vulnerabilities</p>
              <p style={S.cardValue}>{kpi.total}</p>
            </div>
            <div style={S.card}>
              <p style={S.cardLabel}>Critical/High</p>
              <p style={{ ...S.cardValue, color: "#E11D48" }}>{kpi.bySeverity.CRITICAL + kpi.bySeverity.HIGH}</p>
            </div>
            <div style={S.card}>
              <p style={S.cardLabel}>Risk Score</p>
              <p style={{ ...S.cardValue, color: riskColor }}>{kpi.riskScore}/100</p>
            </div>
          </div>

          {/* Scan Details */}
          <h3 style={S.h3}>Scan Details</h3>
          <table style={S.table}>
            <tbody>
              <tr><td style={{ ...S.td, fontWeight: 600, color: "#64748B", width: "180px" }}>{reportProfile.targetLabel}:</td><td style={S.td}>{targetList}</td></tr>
              <tr><td style={{ ...S.td, fontWeight: 600, color: "#64748B" }}>Tool:</td><td style={S.td}>{scanJobInfo.toolName}</td></tr>
              <tr><td style={{ ...S.td, fontWeight: 600, color: "#64748B" }}>Status:</td><td style={S.td}>{scanJobInfo.status}</td></tr>
              <tr><td style={{ ...S.td, fontWeight: 600, color: "#64748B" }}>Scan Started:</td><td style={S.td}>{formatDate(scanJobInfo.startedAt)}</td></tr>
              <tr><td style={{ ...S.td, fontWeight: 600, color: "#64748B" }}>Scan Completed:</td><td style={S.td}>{formatDate(scanJobInfo.completedAt)}</td></tr>
              <tr><td style={{ ...S.td, fontWeight: 600, color: "#64748B" }}>Duration:</td><td style={S.td}>{scanDuration(scanJobInfo.startedAt, scanJobInfo.completedAt)}</td></tr>
            </tbody>
          </table>

          {/* Severity Breakdown */}
          <h3 style={S.h3}>Severity Breakdown</h3>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Severity</th>
                <th style={{ ...S.th, textAlign: "right" }}>Count</th>
                <th style={{ ...S.th, textAlign: "right" }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {SEVERITY_KEYS.map((sev) => (
                <tr key={sev}>
                  <td style={S.td}><span style={S.badge(sev)}>{sev}</span></td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{kpi.bySeverity[sev]}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{kpi.total > 0 ? Math.round((kpi.bySeverity[sev] / kpi.total) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ════════════ PAGE 3: VULNERABILITIES TABLE ════════════ */}
        <div data-pdf-page="true" style={S.section}>
          <h2 style={S.h2}>Vulnerabilities Identified</h2>

          {findings.length === 0 ? (
            <p>No vulnerabilities were identified during this scan.</p>
          ) : (
            <table style={S.table}>
              <VulnerabilityTableHead />
              <tbody>
                {(vulnerabilityPages[0] ?? []).map((item) => (
                  <VulnerabilityTableRow key={item.finding.id} item={item} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ════════════ PAGE 4+: DETAILED FINDINGS ════════════ */}
        {vulnerabilityPages.slice(1).map((pageFindings, pageOffset) => {
          const pageIndex = pageOffset + 1;

          return (
            <div key={`vulnerability-page-${pageIndex}`} data-pdf-page="true" style={S.section}>
              <h2 style={S.h2}>Vulnerabilities Identified (Continued)</h2>

              <table style={S.table}>
                <VulnerabilityTableHead />
                <tbody>
                  {pageFindings.map((item) => (
                    <VulnerabilityTableRow key={item.finding.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {detailedFindingPages.map((pageFindings, pageIndex) => (
          <div key={`finding-page-${pageIndex}`} data-pdf-page="true" style={S.section}>
            <h2 style={S.h2}>
              Detailed Findings{pageIndex > 0 ? " (Continued)" : ""}
            </h2>

            {pageFindings.map((item) => (
              <DetailedFindingCard key={item.finding.id} item={item} />
            ))}
          </div>
        ))}

        {/* ════════════ PAGE: RISK ASSESSMENT ════════════ */}
        <div data-pdf-page="true" style={S.section}>
          <h2 style={S.h2}>Risk Assessment</h2>

          <p>
            Based on the comprehensive analysis of identified vulnerabilities, their severity levels, exploitability,
            and potential impact, the overall risk assessment for the {targetScope} is:
          </p>

          <div style={{ ...S.cardRow, marginTop: "20px" }}>
            <div style={{ ...S.card, borderColor: riskColor, borderWidth: "2px" }}>
              <p style={S.cardLabel}>Overall Risk Level</p>
              <p style={{ ...S.cardValue, color: riskColor }}>{riskLabel}</p>
            </div>
            <div style={S.card}>
              <p style={S.cardLabel}>Total Risk Score</p>
              <p style={S.cardValue}>{kpi.riskScore}</p>
            </div>
            <div style={S.card}>
              <p style={S.cardLabel}>Remediation Rate</p>
              <p style={{ ...S.cardValue, color: "#10B981" }}>{kpi.remediationRate}%</p>
            </div>
          </div>

          {/* OWASP Mapping */}
          {compliance.length > 0 && (
            <>
              <h3 style={S.h3}>OWASP Top 10 Mapping</h3>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Category</th>
                    <th style={{ ...S.th, textAlign: "right", width: "80px" }}>Findings</th>
                    <th style={{ ...S.th, width: "100px" }}>Max Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.map((c, i) => (
                    <tr key={i}>
                      <td style={S.td}>{c.label}</td>
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{c.count}</td>
                      <td style={S.td}><span style={S.badge(c.severity)}>{c.severity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ════════════ PAGE: RECOMMENDATIONS ════════════ */}
        {(recommendationPages.length > 0 ? recommendationPages : [[]]).map((pageItems, pageIndex) => (
          <div key={`recommendation-page-${pageIndex}`} data-pdf-page="true" style={S.section}>
            <h2 style={S.h2}>
              Security Recommendations{pageIndex > 0 ? " (Continued)" : ""}
            </h2>

            <p>
              Based on the identified vulnerabilities and risk assessment, the following remediation actions are
              recommended to improve the security posture of the {reportProfile.recommendationSubject}:
            </p>

            {pageItems.length === 0 ? (
              <p>No open remediation recommendations are currently required.</p>
            ) : (
              pageItems.map(({ finding: f, index }) => (
                <div
                  key={`recommendation-${f.id}`}
                  data-pdf-avoid-break="true"
                  style={{
                    padding: "12px 14px",
                    marginBottom: "12px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "6px",
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "6px" }}>
                    <span style={S.badge(f.severity)}>{f.severity}</span>
                    <strong style={{ fontSize: "12px", lineHeight: "1.5" }}>
                      {index + 1}. {f.title}
                    </strong>
                  </div>
                  <div style={{ fontSize: "12px", color: "#334155", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                    {f.remediation ? f.remediation.split("\n")[0].slice(0, 180) : "Review and remediate."}
                  </div>
                </div>
              ))
            )}
          </div>
        ))}

        {/* ════════════ PAGE: CONCLUSION ════════════ */}
        <div data-pdf-page="true" style={S.section}>
          <h2 style={S.h2}>Conclusion</h2>

          <p>
            This {reportProfile.assessmentName} has identified <strong>{kpi.total} security vulnerabilities</strong> in
            the {targetScope}. The findings should be carefully reviewed and prioritized based on the risk levels assigned.
          </p>

          <p>
            It is strongly recommended to address all <strong style={{ color: "#E11D48" }}>CRITICAL</strong> and{" "}
            <strong style={{ color: "#F97316" }}>HIGH</strong> severity findings immediately, followed by MEDIUM and LOW severity
            items according to available resources and priorities.
          </p>

          <p>
            Regular security assessments should be conducted to maintain a strong security posture and protect against emerging threats.
          </p>

          <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#F8FAFC", borderRadius: "8px", border: "1px solid #E5E9F0" }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: 700 }}>Important Notes:</h4>
            <ul style={{ paddingLeft: "18px", fontSize: "12px", color: "#475569", margin: "0" }}>
              <li style={{ marginBottom: "4px" }}>This assessment was conducted using automated tools and may not identify all vulnerabilities</li>
              <li style={{ marginBottom: "4px" }}>Manual verification and testing is recommended for critical systems</li>
              <li style={{ marginBottom: "4px" }}>Results should be validated before taking remediation actions</li>
              <li>This report is confidential and should be handled securely</li>
            </ul>
          </div>

          <div style={{ marginTop: "30px", fontSize: "10px", color: "#94A3B8", lineHeight: "1.6", borderTop: "1px solid #E5E9F0", paddingTop: "16px" }}>
            <strong>DISCLAIMER:</strong> This {reportProfile.summaryReportName} is provided for educational and authorized security assessment
            purposes only. The tools and techniques used are intended for legitimate security testing in controlled
            environments with proper authorization. Unauthorized use of these tools against systems you do not own or have
            explicit permission to test is illegal and unethical.
          </div>
        </div>

      </div>
    );
  }
);

PdfToolReport.displayName = "PdfToolReport";
