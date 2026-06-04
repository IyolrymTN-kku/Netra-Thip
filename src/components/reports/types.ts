import type { AssetType, FindingStatus, JobStatus, Severity } from "@prisma/client";

export const SEVERITY_KEYS: Severity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
];

export type SeverityCounts = Record<Severity, number>;

export interface ReportKpi {
  total: number;
  open: number;
  resolved: number;
  ignored: number;
  bySeverity: SeverityCounts;
  riskScore: number;
  remediationRate: number;
}

export interface TrendPoint extends SeverityCounts {
  week: string;
}

export interface ComplianceSummary {
  framework: string;
  label: string;
  count: number;
  severity: Severity;
}

export interface TopTargetSummary {
  target: string;
  count: number;
  maxSeverity: Severity;
}

export interface ReportAsset {
  target: string;
  type: AssetType | string;
}

export interface ScanJobReportInfo {
  id: string;
  toolName: string;
  status: JobStatus | string;
  parameters?: unknown;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ScanJobSummary extends ScanJobReportInfo {
  findingCount: number;
}

export interface ReportFinding {
  id: string;
  title: string;
  severity: Severity;
  status: FindingStatus | string;
  target: string;
  cvss: number | null;
  cves?: unknown;
  description: string;
  remediation: string;
  scanJob?: { toolName: string };
}

export interface ReportProject {
  name: string;
  description: string | null;
  assessorName: string;
}

export interface ReportExportData {
  project: ReportProject;
  assets: ReportAsset[];
  scanJobs: ScanJobReportInfo[];
  scanJobInfo?: ScanJobReportInfo | null;
  findings: ReportFinding[];
  kpi: ReportKpi;
  compliance: ComplianceSummary[];
  topTargets: TopTargetSummary[];
}

export interface ReportsSummaryData {
  kpi: ReportKpi;
  trend: TrendPoint[];
  compliance: ComplianceSummary[];
  topTargets: TopTargetSummary[];
  scanJobs: ScanJobSummary[];
}
