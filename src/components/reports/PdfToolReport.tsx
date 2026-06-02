"use client";

import React, { forwardRef } from "react";
import { SEVERITY_KEYS, type ReportExportData } from "./types";

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

// ── Styles ──
const S = {
  page: {
    width: "794px",
    backgroundColor: "#FFFFFF",
    color: "#0A1628",
    fontFamily: "'Inter', 'Segoe UI', ui-sans-serif, system-ui, sans-serif",
    fontSize: "13px",
    lineHeight: "1.65",
    padding: "0",
    boxSizing: "border-box" as const,
  },
  section: { padding: "36px 44px", pageBreakBefore: "always" as const },
  firstSection: { padding: "36px 44px" },
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
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "12px", marginBottom: "20px" },
  th: { padding: "10px 12px", textAlign: "left" as const, backgroundColor: "#F1F5F9", borderBottom: "2px solid #CBD5E1", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#475569" },
  td: { padding: "9px 12px", borderBottom: "1px solid #E5E9F0", verticalAlign: "top" as const },
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
};

export const PdfToolReport = forwardRef<HTMLDivElement, PdfToolReportProps>(
  ({ data }, ref) => {
    const { project, scanJobInfo, findings, kpi, compliance } = data;
    if (!scanJobInfo) return null;

    const reportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const riskLabel = getRiskLabel(kpi.riskScore);
    const riskColor = getRiskColor(kpi.riskScore);
    const targets = [...new Set(findings.map((f) => f.target))];

    return (
      <div ref={ref} style={S.page}>

        {/* ════════════ PAGE 1: COVER ════════════ */}
        <div style={{
          height: "1080px",
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
            PENETRATION TESTING REPORT
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
                <tr><td style={{ padding: "8px 0", fontWeight: 600, color: "#64748B" }}>Target System:</td><td style={{ padding: "8px 0", fontWeight: 700 }}>{targets.join(", ") || "N/A"}</td></tr>
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
        <div style={S.section}>
          <h2 style={S.h2}>Executive Summary</h2>

          <p>
            This penetration testing report presents the findings of a security assessment conducted
            on the target system{targets.length > 1 ? "s" : ""} <strong>{targets.join(", ")}</strong> using
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
                ? "The target system exhibits significant risk. Immediate remediation action is required to address identified security vulnerabilities."
                : kpi.riskScore >= 15
                  ? "The target system shows moderate risk. Remediation should be prioritized based on severity levels."
                  : kpi.riskScore > 0
                    ? "The target system shows low risk. Identified issues should be addressed in regular maintenance cycles."
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
              <tr><td style={{ ...S.td, fontWeight: 600, color: "#64748B", width: "180px" }}>Target:</td><td style={S.td}>{targets.join(", ")}</td></tr>
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
        <div style={S.section}>
          <h2 style={S.h2}>Vulnerabilities Identified</h2>

          {findings.length === 0 ? (
            <p>No vulnerabilities were identified during this scan.</p>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: "30px" }}>#</th>
                  <th style={S.th}>Vulnerability</th>
                  <th style={{ ...S.th, width: "90px" }}>Severity</th>
                  <th style={S.th}>Target</th>
                  <th style={{ ...S.th, width: "50px", textAlign: "right" }}>CVSS</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f, i) => (
                  <tr key={f.id}>
                    <td style={{ ...S.td, color: "#94A3B8" }}>{i + 1}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{f.title}</td>
                    <td style={S.td}><span style={S.badge(f.severity)}>{f.severity}</span></td>
                    <td style={{ ...S.td, fontFamily: "monospace", fontSize: "11px" }}>{f.target}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{f.cvss ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ════════════ PAGE 4+: DETAILED FINDINGS ════════════ */}
        <div style={S.section}>
          <h2 style={S.h2}>Detailed Findings</h2>

          {findings.map((f, index) => (
            <div key={f.id} style={{
              marginBottom: "28px",
              border: "1px solid #D9DEE8",
              borderRadius: "8px",
              pageBreakInside: "avoid",
              overflow: "hidden",
            }}>
              {/* Finding header */}
              <div style={{
                padding: "14px 18px",
                backgroundColor: "#F1F5F9",
                borderBottom: "1px solid #D9DEE8",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ fontWeight: 800, fontSize: "14px" }}>
                  {index + 1}. {f.title}
                </span>
                <span style={S.badge(f.severity)}>{f.severity}</span>
              </div>

              {/* Finding body */}
              <div style={{ padding: "18px" }}>
                <table style={{ ...S.table, marginBottom: "14px", fontSize: "12px" }}>
                  <tbody>
                    <tr><td style={{ width: "100px", fontWeight: 600, color: "#64748B", padding: "4px 0" }}>Target:</td><td style={{ padding: "4px 0", fontFamily: "monospace" }}>{f.target}</td></tr>
                    <tr><td style={{ fontWeight: 600, color: "#64748B", padding: "4px 0" }}>CVSS:</td><td style={{ padding: "4px 0" }}>{f.cvss ?? "N/A"}</td></tr>
                    <tr><td style={{ fontWeight: 600, color: "#64748B", padding: "4px 0" }}>Status:</td><td style={{ padding: "4px 0" }}>{f.status}</td></tr>
                    {formatCves(f.cves) && (
                      <tr><td style={{ fontWeight: 600, color: "#64748B", padding: "4px 0" }}>CVEs:</td><td style={{ padding: "4px 0", fontFamily: "monospace", fontSize: "11px" }}>{formatCves(f.cves)}</td></tr>
                    )}
                  </tbody>
                </table>

                <h4 style={{ fontSize: "12px", fontWeight: 800, color: "#0066FF", margin: "12px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</h4>
                <div style={{ whiteSpace: "pre-wrap", fontSize: "12px", color: "#334155", lineHeight: "1.7" }}>
                  {f.description || "No description provided."}
                </div>

                <h4 style={{ fontSize: "12px", fontWeight: 800, color: "#10B981", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Remediation</h4>
                <div style={{ whiteSpace: "pre-wrap", fontSize: "12px", color: "#334155", lineHeight: "1.7" }}>
                  {f.remediation || "No remediation guidance provided."}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ════════════ PAGE: RISK ASSESSMENT ════════════ */}
        <div style={S.section}>
          <h2 style={S.h2}>Risk Assessment</h2>

          <p>
            Based on the comprehensive analysis of identified vulnerabilities, their severity levels, exploitability,
            and potential impact, the overall risk assessment for the target system is:
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
        <div style={S.section}>
          <h2 style={S.h2}>Security Recommendations</h2>

          <p>
            Based on the identified vulnerabilities and risk assessment, the following remediation actions are
            recommended to improve the security posture of the target system:
          </p>

          {SEVERITY_KEYS.filter((sev) => sev !== "INFO").map((sev) => {
            const sevFindings = findings.filter((f) => f.severity === sev && f.status !== "RESOLVED");
            if (sevFindings.length === 0) return null;
            return (
              <div key={sev} style={{ marginBottom: "20px" }}>
                <h3 style={{ ...S.h3, marginTop: "16px" }}>
                  <span style={S.badge(sev)}>{sev}</span> Priority
                </h3>
                <ul style={{ paddingLeft: "20px", fontSize: "12px" }}>
                  {sevFindings.map((f, i) => (
                    <li key={i} style={{ marginBottom: "8px" }}>
                      <strong>{f.title}</strong> — {f.remediation ? f.remediation.split("\n")[0].slice(0, 150) : "Review and remediate."}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* ════════════ PAGE: CONCLUSION ════════════ */}
        <div style={S.section}>
          <h2 style={S.h2}>Conclusion</h2>

          <p>
            This automated penetration testing assessment has identified <strong>{kpi.total} security vulnerabilities</strong> in
            the target system. The findings should be carefully reviewed and prioritized based on the risk levels assigned.
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
            <strong>DISCLAIMER:</strong> This penetration testing report is provided for educational and authorized security assessment
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
