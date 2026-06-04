import { NextResponse } from "next/server";
import { Role, Severity, FindingStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/guards";

export const runtime = "nodejs";

const OWASP_KEYWORDS: Record<string, string[]> = {
  "A01 Broken Access Control": ["access control", "idor", "privilege", "bypass"],
  "A02 Cryptographic Failures": ["ssl", "tls", "certificate", "http ", "crypto"],
  "A03 Injection": ["sql", "xss", "injection", "rce", "ssti", "command"],
  "A04 Insecure Design": ["design", "architecture", "threat"],
  "A05 Security Misconfiguration": ["misconfiguration", "default", "exposed", "directory listing"],
  "A06 Vulnerable Components": ["cve-", "outdated", "vulnerable version", "deprecated"],
  "A07 Auth Failures": ["authentication", "broken auth", "session", "login", "password"],
  "A08 Software and Data Integrity Failures": ["integrity", "deserialization", "update"],
  "A09 Security Logging and Monitoring Failures": ["logging", "monitoring", "audit"],
  "A10 SSRF": ["ssrf", "server-side request forgery"],
};

const SEV_WEIGHT = {
  CRITICAL: 10,
  HIGH: 5,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
};

function getIsoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export async function GET() {
  const guard = await requireRole([Role.ADMIN, Role.PENTESTER, Role.VIEWER]);
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const project = await prisma.project.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
      scanJobs: {
        select: {
          id: true,
          toolName: true,
          status: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          _count: { select: { findings: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }

  const findings = await prisma.finding.findMany({
    where: { projectId: project.id },
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      target: true,
      createdAt: true,
    },
  });

  // KPI Aggregation
  const kpi = {
    total: findings.length,
    open: 0,
    resolved: 0,
    ignored: 0,
    bySeverity: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    } as Record<Severity, number>,
    riskScore: 0,
    remediationRate: 100,
  };

  // Trend Aggregation (grouped by week)
  const trendMap = new Map<string, { week: string, CRITICAL: number, HIGH: number, MEDIUM: number, LOW: number, INFO: number }>();

  // Compliance Aggregation
  const complianceMap = new Map<string, { framework: string, label: string, count: number, maxSeverityValue: number, severity: Severity }>();

  // Top Targets Aggregation
  const targetMap = new Map<string, { target: string, count: number, maxSeverityValue: number, maxSeverity: Severity }>();

  let riskPenalty = 0;

  for (const f of findings) {
    // KPI
    if (f.status === FindingStatus.OPEN) kpi.open++;
    if (f.status === FindingStatus.RESOLVED) kpi.resolved++;
    if (f.status === FindingStatus.IGNORED) kpi.ignored++;

    kpi.bySeverity[f.severity]++;

    if (f.status !== FindingStatus.RESOLVED) {
      riskPenalty += SEV_WEIGHT[f.severity];
    }

    // Trend
    const week = getIsoWeek(f.createdAt);
    if (!trendMap.has(week)) {
      trendMap.set(week, { week, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 });
    }
    trendMap.get(week)![f.severity]++;

    // Compliance Soft-Mapping
    const titleLower = f.title.toLowerCase();
    for (const [fw, keywords] of Object.entries(OWASP_KEYWORDS)) {
      if (keywords.some(k => titleLower.includes(k))) {
        if (!complianceMap.has(fw)) {
          complianceMap.set(fw, { framework: "OWASP", label: fw, count: 0, maxSeverityValue: -1, severity: "INFO" });
        }
        const comp = complianceMap.get(fw)!;
        comp.count++;
        if (SEV_WEIGHT[f.severity] > comp.maxSeverityValue) {
          comp.maxSeverityValue = SEV_WEIGHT[f.severity];
          comp.severity = f.severity;
        }
        break; // Map to the first matched category only to avoid double counting
      }
    }

    // Top Targets
    if (!targetMap.has(f.target)) {
      targetMap.set(f.target, { target: f.target, count: 0, maxSeverityValue: -1, maxSeverity: "INFO" });
    }
    const tMap = targetMap.get(f.target)!;
    tMap.count++;
    if (SEV_WEIGHT[f.severity] > tMap.maxSeverityValue) {
      tMap.maxSeverityValue = SEV_WEIGHT[f.severity];
      tMap.maxSeverity = f.severity;
    }
  }

  // Finalize KPIs
  // Risk Score: 0-100 scale where 0 is perfect, 100 is very bad. Capped at 100.
  kpi.riskScore = Math.min(100, riskPenalty);
  kpi.remediationRate = kpi.total > 0 ? Math.round((kpi.resolved / kpi.total) * 100) : 100;

  // Finalize Trend (sort chronologically)
  const trend = Array.from(trendMap.values()).sort((a, b) => a.week.localeCompare(b.week));

  // Finalize Compliance
  const compliance = Array.from(complianceMap.values()).map(c => ({
    framework: c.framework,
    label: c.label,
    count: c.count,
    severity: c.severity,
  })).sort((a, b) => b.count - a.count);

  // Finalize Top Targets
  const topTargets = Array.from(targetMap.values()).map(t => ({
    target: t.target,
    count: t.count,
    maxSeverity: t.maxSeverity,
  })).sort((a, b) => b.count - a.count).slice(0, 10);

  // Map scan jobs for the response
  const scanJobs = (project.scanJobs || []).map((j) => ({
    id: j.id,
    toolName: j.toolName,
    status: j.status,
    startedAt: j.startedAt,
    completedAt: j.completedAt,
    createdAt: j.createdAt,
    findingCount: j._count?.findings ?? 0,
  }));

  return NextResponse.json({
    kpi,
    trend,
    compliance,
    topTargets,
    scanJobs,
  });
}
