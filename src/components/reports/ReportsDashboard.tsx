"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Icon } from "@/components/icons/Icon";
import { ReportsKpi } from "./ReportsKpi";
import { TrendChart } from "./TrendChart";
import { CompliancePanel } from "./CompliancePanel";
import { TopTargetsTable } from "./TopTargetsTable";
import { PdfReportTemplate } from "./PdfReportTemplate";
import { PdfToolReport } from "./PdfToolReport";

interface ScanJobSummary {
  id: string;
  toolName: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  findingCount: number;
}

interface SummaryData {
  kpi: any;
  trend: any[];
  compliance: any[];
  topTargets: any[];
  scanJobs: ScanJobSummary[];
}

function formatDateShort(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "var(--ok)",
  RUNNING: "var(--nt-blue)",
  PENDING: "var(--ink-4)",
  FAILED: "var(--err)",
};

export function ReportsDashboard() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Overview report state
  const [exporting, setExporting] = useState(false);
  const [fullExportData, setFullExportData] = useState<any>(null);
  const overviewRef = useRef<HTMLDivElement>(null);

  // Per-tool report state
  const [exportingJobId, setExportingJobId] = useState<string | null>(null);
  const [toolExportData, setToolExportData] = useState<any>(null);
  const toolReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/reports/summary");
        if (!res.ok) throw new Error("Failed to load reports summary");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Overview Report Export ──
  const handleExportOverview = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/reports/export");
      if (!res.ok) throw new Error("Failed to fetch report data");
      const json = await res.json();
      setFullExportData(json);
      await new Promise((r) => setTimeout(r, 500));
      const html2pdf = (await import("html2pdf.js")).default;
      if (!overviewRef.current) throw new Error("Container not found");
      const timestamp = new Date().toISOString().slice(0, 10);
      await html2pdf().set({
        margin: [10, 0, 10, 0],
        filename: `Netra-Thip_Overview_Report_${timestamp}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(overviewRef.current).save();
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
      setTimeout(() => setFullExportData(null), 1000);
    }
  }, [exporting]);

  // ── Per-Tool Report Export ──
  const handleExportTool = useCallback(async (scanJobId: string) => {
    if (exportingJobId) return;
    setExportingJobId(scanJobId);
    try {
      const res = await fetch(`/api/reports/export?scanJobId=${scanJobId}`);
      if (!res.ok) throw new Error("Failed to fetch tool report data");
      const json = await res.json();
      setToolExportData(json);
      await new Promise((r) => setTimeout(r, 600));
      const html2pdf = (await import("html2pdf.js")).default;
      if (!toolReportRef.current) throw new Error("Container not found");
      const toolName = json.scanJobInfo?.toolName || "scan";
      const timestamp = new Date().toISOString().slice(0, 10);
      await html2pdf().set({
        margin: [10, 0, 10, 0],
        filename: `Netra-Thip_${toolName}_Report_${timestamp}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(toolReportRef.current).save();
    } catch (err) {
      console.error("Tool PDF export failed:", err);
    } finally {
      setExportingJobId(null);
      setTimeout(() => setToolExportData(null), 1000);
    }
  }, [exportingJobId]);

  if (loading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-[var(--ink-4)] gap-3 nt-fade-in">
        <Icon name="search" size={24} className="animate-spin opacity-50" />
        <span className="text-[12.5px] font-medium">Aggregating findings...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="nt-card p-6 border-[var(--err)] bg-red-500/5 text-[var(--err)] text-[12.5px]">
        <strong>Error:</strong> {error || "Failed to load"}
      </div>
    );
  }

  const completedJobs = (data.scanJobs || []).filter((j) => j.status === "COMPLETED");

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-2 nt-stagger">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">Reports Dashboard</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">
            Aggregated vulnerability insights and compliance mapping.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-primary"
            onClick={handleExportOverview}
            disabled={exporting}
          >
            <Icon name="download" size={14} />
            {exporting ? "Generating..." : "Export Overview PDF"}
          </button>
        </div>
      </div>

      {/* ── Dashboard KPIs ── */}
      <div className="nt-stagger">
        <ReportsKpi kpi={data.kpi} />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 nt-stagger">
        <div className="lg:col-span-2 h-[340px]">
          <TrendChart data={data.trend} />
        </div>
        <div className="h-[340px]">
          <CompliancePanel data={data.compliance} totalFindings={data.kpi.total} />
        </div>
      </div>

      {/* ── Top Targets ── */}
      <div className="nt-stagger">
        <TopTargetsTable targets={data.topTargets} />
      </div>

      {/* ── Per-Scan Reports ── */}
      <div className="nt-card p-0 overflow-hidden nt-stagger">
        <div className="p-5 border-b border-[var(--line)]">
          <h3 className="text-[14px] font-bold text-[var(--ink)]">Per-Scan Reports</h3>
          <p className="text-[11.5px] text-[var(--ink-4)] mt-1">
            Download individual pentest reports for each completed scan.
          </p>
        </div>

        {completedJobs.length === 0 ? (
          <div className="p-8 text-center text-[12.5px] text-[var(--ink-4)]">
            No completed scans available for report generation.
          </div>
        ) : (
          <table className="w-full text-[12.5px] text-left border-collapse">
            <thead className="bg-[var(--surface-2)] text-[10.5px] font-bold text-[var(--ink-3)] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-2.5 border-b border-[var(--line)]">Tool</th>
                <th className="px-4 py-2.5 border-b border-[var(--line)]">Date</th>
                <th className="px-4 py-2.5 border-b border-[var(--line)] text-right">Findings</th>
                <th className="px-4 py-2.5 border-b border-[var(--line)]">Status</th>
                <th className="px-4 py-2.5 border-b border-[var(--line)] w-[140px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {completedJobs.map((job) => (
                <tr key={job.id} className="hover:bg-[var(--hover)] border-b border-[var(--line)] last:border-0 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-[var(--ink)]">{job.toolName}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-3)]">
                    {formatDateShort(job.completedAt || job.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="tnum font-bold">{job.findingCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[job.status] || "var(--ink-4)" }}
                      />
                      <span className="text-[11px] font-semibold" style={{ color: STATUS_COLORS[job.status] || "var(--ink-4)" }}>
                        {job.status}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="btn text-[11px] py-1 px-3"
                      onClick={() => handleExportTool(job.id)}
                      disabled={exportingJobId === job.id}
                    >
                      <Icon name="download" size={12} />
                      {exportingJobId === job.id ? "Generating..." : "Download PDF"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Hidden containers for PDF rendering ── */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div ref={overviewRef}>
          {fullExportData && <PdfReportTemplate data={fullExportData} />}
        </div>
        <div ref={toolReportRef}>
          {toolExportData && <PdfToolReport data={toolExportData} />}
        </div>
      </div>

    </div>
  );
}
