"use client";

import React, { forwardRef } from "react";
import type { Severity } from "@prisma/client";
import { PDF_PAGE_HEIGHT_PX, PDF_PAGE_WIDTH_PX } from "./pdfLayout";
import { SEVERITY_KEYS, type ReportExportData } from "./types";

interface PdfReportTemplateProps {
  data: ReportExportData;
}

const SEV_COLORS: Record<Severity, { bg: string, text: string }> = {
  CRITICAL: { bg: "#E11D48", text: "#FFF" },
  HIGH:     { bg: "#F97316", text: "#FFF" },
  MEDIUM:   { bg: "#EAB308", text: "#FFF" },
  LOW:      { bg: "#0066FF", text: "#FFF" },
  INFO:     { bg: "#64748B", text: "#FFF" },
};

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

const OVERVIEW_FINDINGS_PER_PAGE = 3;
const OVERVIEW_PAGE_STYLE = {
  width: `${PDF_PAGE_WIDTH_PX}px`,
  minHeight: `${PDF_PAGE_HEIGHT_PX}px`,
  padding: "40px",
  backgroundColor: "#FFFFFF",
  boxSizing: "border-box" as const,
  overflow: "visible" as const,
};

export const PdfReportTemplate = forwardRef<HTMLDivElement, PdfReportTemplateProps>(
  ({ data }, ref) => {
    const { project, assets, findings, kpi, compliance, topTargets } = data;
    const reportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const detailedFindingPages = findings.length > 0
      ? chunkItems(findings, OVERVIEW_FINDINGS_PER_PAGE)
      : [];

    return (
      <div
        ref={ref}
        style={{
          width: `${PDF_PAGE_WIDTH_PX}px`,
          backgroundColor: "#FFFFFF",
          color: "#0A1628",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "14px",
          lineHeight: 1.6,
          padding: "0",
          boxSizing: "border-box"
        }}
      >
        {/* --- PAGE 1: COVER PAGE --- */}
        <div data-pdf-page="true" style={{ ...OVERVIEW_PAGE_STYLE, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <h1 style={{ fontSize: "48px", fontWeight: 800, color: "#0066FF", margin: "0 0 20px 0" }}>Netra-Thip</h1>
          <h2 style={{ fontSize: "32px", fontWeight: 700, margin: "0 0 40px 0" }}>Security Assessment Report</h2>

          <div style={{ padding: "30px", border: "2px solid #E5E9F0", borderRadius: "12px", width: "80%", marginBottom: "60px" }}>
            <p style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 10px 0" }}>Project</p>
            <p style={{ fontSize: "24px", fontWeight: 700, color: "#0066FF", margin: "0 0 20px 0" }}>{project.name}</p>

            <p style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 5px 0" }}>Date of Report</p>
            <p style={{ fontSize: "18px", margin: "0 0 20px 0" }}>{reportDate}</p>

            <p style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 5px 0" }}>Assessor</p>
            <p style={{ fontSize: "18px", margin: 0 }}>{project.assessorName}</p>
          </div>

          <p style={{ color: "#E11D48", fontWeight: 700, marginTop: "auto", fontSize: "16px", letterSpacing: "2px" }}>
            CONFIDENTIAL — FOR INTERNAL USE ONLY
          </p>
        </div>

        {/* --- PAGE 2: EXECUTIVE SUMMARY --- */}
        <div data-pdf-page="true" style={{ ...OVERVIEW_PAGE_STYLE, pageBreakBefore: "always", paddingTop: "60px" }}>
          <h2 style={{ fontSize: "28px", borderBottom: "2px solid #0066FF", paddingBottom: "10px", marginBottom: "20px" }}>
            1. Executive Summary
          </h2>
          <p style={{ marginBottom: "20px" }}>
            This report outlines the findings from the security assessment of <strong>{project.name}</strong>.
            The goal of this assessment was to identify vulnerabilities, assess their risk impact, and provide actionable remediation guidance.
          </p>

          <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
            <div style={{ flex: 1, padding: "20px", backgroundColor: "#F4F6FA", borderRadius: "8px", textAlign: "center" }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: 700, color: "#5A6478", textTransform: "uppercase" }}>Total Findings</p>
              <p style={{ margin: 0, fontSize: "36px", fontWeight: 800 }}>{kpi.total}</p>
            </div>
            <div style={{ flex: 1, padding: "20px", backgroundColor: "#F4F6FA", borderRadius: "8px", textAlign: "center" }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: 700, color: "#5A6478", textTransform: "uppercase" }}>Open Issues</p>
              <p style={{ margin: 0, fontSize: "36px", fontWeight: 800, color: "#E11D48" }}>{kpi.open}</p>
            </div>
            <div style={{ flex: 1, padding: "20px", backgroundColor: "#F4F6FA", borderRadius: "8px", textAlign: "center" }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: 700, color: "#5A6478", textTransform: "uppercase" }}>Risk Score</p>
              <p style={{ margin: 0, fontSize: "36px", fontWeight: 800, color: kpi.riskScore > 50 ? "#E11D48" : kpi.riskScore > 20 ? "#F97316" : "#10B981" }}>
                {kpi.riskScore}/100
              </p>
            </div>
          </div>

          <h3 style={{ fontSize: "20px", marginBottom: "15px", marginTop: "30px" }}>Severity Breakdown</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F4F6FA", borderBottom: "1px solid #D9DEE8" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Severity</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {SEVERITY_KEYS.map((sev) => (
                <tr key={sev} style={{ borderBottom: "1px solid #E5E9F0" }}>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      backgroundColor: SEV_COLORS[sev].bg,
                      color: SEV_COLORS[sev].text,
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 700
                    }}>{sev}</span>
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: 700 }}>{kpi.bySeverity[sev]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: "20px", marginBottom: "15px", marginTop: "30px" }}>Scope & Methodology</h3>
          <p>The assessment included {assets.length} assets mapped to this project. Automated and manual verification tools were utilized to discover vulnerabilities in the defined scope.</p>
          <ul style={{ paddingLeft: "20px", marginTop: "10px" }}>
            {assets.map((a, i) => (
              <li key={i} style={{ marginBottom: "5px" }}><strong>{a.target}</strong> ({a.type})</li>
            ))}
          </ul>
        </div>

        {/* --- PAGE 3: DETAILED FINDINGS --- */}
        {findings.length === 0 ? (
          <div data-pdf-page="true" style={{ ...OVERVIEW_PAGE_STYLE, pageBreakBefore: "always", paddingTop: "60px" }}>
            <h2 style={{ fontSize: "28px", borderBottom: "2px solid #0066FF", paddingBottom: "10px", marginBottom: "20px" }}>
              2. Detailed Findings
            </h2>
            <p>No vulnerabilities found.</p>
          </div>
        ) : (
          detailedFindingPages.map((pageFindings, pageIndex) => (
            <div key={`overview-finding-page-${pageIndex}`} data-pdf-page="true" style={{ ...OVERVIEW_PAGE_STYLE, pageBreakBefore: "always", paddingTop: "60px" }}>
              <h2 style={{ fontSize: "28px", borderBottom: "2px solid #0066FF", paddingBottom: "10px", marginBottom: "20px" }}>
                2. Detailed Findings{pageIndex > 0 ? " (Continued)" : ""}
              </h2>

              {pageFindings.map((f, index) => {
                const findingIndex = pageIndex * OVERVIEW_FINDINGS_PER_PAGE + index;

                return (
                  <div key={f.id} data-pdf-avoid-break="true" style={{
                    marginBottom: "30px",
                    border: "1px solid #D9DEE8",
                    borderRadius: "8px",
                    breakInside: "avoid",
                    pageBreakInside: "avoid"
                  }}>
                    <div style={{
                      padding: "15px",
                      backgroundColor: "#F4F6FA",
                      borderBottom: "1px solid #D9DEE8",
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                        {findingIndex + 1}. {f.title}
                      </h3>
                      <span style={{
                        backgroundColor: SEV_COLORS[f.severity].bg,
                        color: SEV_COLORS[f.severity].text,
                        padding: "4px 10px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: 700
                      }}>
                        {f.severity}
                      </span>
                    </div>
                    <div style={{ padding: "20px" }}>
                      <table style={{ width: "100%", marginBottom: "15px", fontSize: "13px" }}>
                        <tbody>
                          <tr>
                            <td style={{ width: "120px", fontWeight: 600, color: "#5A6478" }}>Target:</td>
                            <td>{f.target}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 600, color: "#5A6478" }}>CVSS Score:</td>
                            <td>{f.cvss || "N/A"}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 600, color: "#5A6478" }}>Status:</td>
                            <td>{f.status}</td>
                          </tr>
                        </tbody>
                      </table>

                      <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "15px 0 5px 0", color: "#0066FF" }}>Description</h4>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", color: "#2A3447", marginBottom: "15px" }}>
                        {f.description || "No description provided."}
                      </div>

                      <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "15px 0 5px 0", color: "#10B981" }}>Remediation</h4>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", color: "#2A3447" }}>
                        {f.remediation || "No remediation provided."}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* --- PAGE 4: APPENDIX --- */}
        <div data-pdf-page="true" style={{ ...OVERVIEW_PAGE_STYLE, pageBreakBefore: "always", paddingTop: "60px" }}>
          <h2 style={{ fontSize: "28px", borderBottom: "2px solid #0066FF", paddingBottom: "10px", marginBottom: "20px" }}>
            3. Appendix
          </h2>

          <h3 style={{ fontSize: "20px", marginBottom: "15px" }}>OWASP Top 10 Mapping</h3>
          {compliance.length === 0 ? (
            <p>No OWASP mapping data available.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F4F6FA", borderBottom: "1px solid #D9DEE8" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>Category</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Count</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Max Severity</th>
                </tr>
              </thead>
              <tbody>
                {compliance.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #E5E9F0" }}>
                    <td style={{ padding: "10px" }}>{c.label}</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>{c.count}</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <span style={{
                        color: SEV_COLORS[c.severity].bg,
                        fontWeight: 700
                      }}>{c.severity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ fontSize: "20px", marginBottom: "15px" }}>Top 10 Vulnerable Targets</h3>
          {topTargets.length === 0 ? (
            <p>No target data available.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F4F6FA", borderBottom: "1px solid #D9DEE8" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>Target</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Findings</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Max Severity</th>
                </tr>
              </thead>
              <tbody>
                {topTargets.map((t, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #E5E9F0" }}>
                    <td style={{ padding: "10px", fontFamily: "monospace" }}>{t.target}</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>{t.count}</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <span style={{
                        color: SEV_COLORS[t.maxSeverity].bg,
                        fontWeight: 700
                      }}>{t.maxSeverity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    );
  }
);

PdfReportTemplate.displayName = "PdfReportTemplate";
