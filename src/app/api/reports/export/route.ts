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

const SEV_WEIGHT: Record<string, number> = {
  CRITICAL: 10,
  HIGH: 5,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
};

const SEV_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

export async function GET(req: Request) {
  const guard = await requireRole([Role.ADMIN, Role.PENTESTER]);
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const url = new URL(req.url);
  const scanJobId = url.searchParams.get("scanJobId");

  const project = await prisma.project.findFirst({
    where: { userId: session.user.id },
    include: {
      user: { select: { name: true, email: true } },
      assets: { select: { target: true, type: true } },
      scanJobs: {
        select: {
          id: true,
          toolName: true,
          status: true,
          parameters: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }

  // If scanJobId provided, verify it belongs to this project
  if (scanJobId) {
    const targetJob = project.scanJobs.find((j) => j.id === scanJobId);
    if (!targetJob) {
      return NextResponse.json({ error: "scan job not found" }, { status: 404 });
    }
  }

  // Fetch findings — filtered by scanJobId if provided
  const findingsWhere: any = { projectId: project.id };
  if (scanJobId) findingsWhere.scanJobId = scanJobId;

  const findings = await prisma.finding.findMany({
    where: findingsWhere,
    include: { scanJob: { select: { toolName: true } } },
  });

  // Sort: CRITICAL → INFO
  findings.sort(
    (a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)
  );

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

  const complianceMap = new Map<
    string,
    { framework: string; label: string; count: number; maxSev: number; severity: Severity }
  >();
  const targetMap = new Map<
    string,
    { target: string; count: number; maxSev: number; maxSeverity: Severity }
  >();

  let riskPenalty = 0;

  for (const f of findings) {
    if (f.status === FindingStatus.OPEN) kpi.open++;
    if (f.status === FindingStatus.RESOLVED) kpi.resolved++;
    if (f.status === FindingStatus.IGNORED) kpi.ignored++;
    kpi.bySeverity[f.severity]++;
    if (f.status !== FindingStatus.RESOLVED) riskPenalty += SEV_WEIGHT[f.severity];

    // Compliance
    const tl = f.title.toLowerCase();
    for (const [fw, kws] of Object.entries(OWASP_KEYWORDS)) {
      if (kws.some((k) => tl.includes(k))) {
        if (!complianceMap.has(fw))
          complianceMap.set(fw, { framework: "OWASP", label: fw, count: 0, maxSev: -1, severity: "INFO" });
        const c = complianceMap.get(fw)!;
        c.count++;
        if (SEV_WEIGHT[f.severity] > c.maxSev) { c.maxSev = SEV_WEIGHT[f.severity]; c.severity = f.severity; }
        break;
      }
    }

    // Targets
    if (!targetMap.has(f.target))
      targetMap.set(f.target, { target: f.target, count: 0, maxSev: -1, maxSeverity: "INFO" });
    const tm = targetMap.get(f.target)!;
    tm.count++;
    if (SEV_WEIGHT[f.severity] > tm.maxSev) { tm.maxSev = SEV_WEIGHT[f.severity]; tm.maxSeverity = f.severity; }
  }

  kpi.riskScore = Math.min(100, riskPenalty);
  kpi.remediationRate = kpi.total > 0 ? Math.round((kpi.resolved / kpi.total) * 100) : 100;

  const compliance = Array.from(complianceMap.values())
    .map((c) => ({ framework: c.framework, label: c.label, count: c.count, severity: c.severity }))
    .sort((a, b) => b.count - a.count);

  const topTargets = Array.from(targetMap.values())
    .map((t) => ({ target: t.target, count: t.count, maxSeverity: t.maxSeverity }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Determine the specific scan job info if filtered
  const scanJobInfo = scanJobId
    ? project.scanJobs.find((j) => j.id === scanJobId) ?? null
    : null;

  return NextResponse.json({
    project: {
      name: project.name,
      description: project.description,
      assessorName: project.user.name || project.user.email,
    },
    assets: project.assets,
    scanJobs: project.scanJobs,
    scanJobInfo, // The specific scan job when filtering
    findings,
    kpi,
    compliance,
    topTargets,
  });
}
