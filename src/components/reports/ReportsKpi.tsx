import { Severity } from "@prisma/client";

interface ReportsKpiProps {
  kpi: {
    total: number;
    open: number;
    resolved: number;
    ignored: number;
    bySeverity: Record<Severity, number>;
    riskScore: number;
    remediationRate: number;
  };
}

export function ReportsKpi({ kpi }: ReportsKpiProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 nt-stagger">

      {/* 1. Total Findings */}
      <div className="nt-card p-5 flex flex-col justify-between">
        <div className="text-[11.5px] font-semibold text-[var(--ink-3)] uppercase tracking-wider">Total Findings</div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="tnum text-3xl font-bold tracking-tight">{kpi.total}</span>
          <span className="text-[12.5px] text-[var(--ink-4)]">all time</span>
        </div>
      </div>

      {/* 2. Open Issues */}
      <div className="nt-card p-5 flex flex-col justify-between">
        <div className="text-[11.5px] font-semibold text-[var(--ink-3)] uppercase tracking-wider">Open Issues</div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="tnum text-3xl font-bold tracking-tight text-[var(--err)]">{kpi.open}</span>
        </div>
        <div className="mt-3 flex gap-2 text-[11px] font-medium">
          {kpi.bySeverity.CRITICAL > 0 && <span className="sev-critical px-2 py-0.5 rounded-full">{kpi.bySeverity.CRITICAL} C</span>}
          {kpi.bySeverity.HIGH > 0 && <span className="sev-high px-2 py-0.5 rounded-full">{kpi.bySeverity.HIGH} H</span>}
          {kpi.bySeverity.MEDIUM > 0 && <span className="sev-medium px-2 py-0.5 rounded-full">{kpi.bySeverity.MEDIUM} M</span>}
        </div>
      </div>

      {/* 3. Overall Risk Score */}
      <div className="nt-card p-5 flex flex-col justify-between">
        <div className="text-[11.5px] font-semibold text-[var(--ink-3)] uppercase tracking-wider">Risk Score</div>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-12 h-12 rotate-[-90deg]">
              <path
                className="text-[var(--line)]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={kpi.riskScore > 50 ? "text-[var(--sev-critical)]" : kpi.riskScore > 20 ? "text-[var(--sev-high)]" : "text-[var(--ok)]"}
                strokeWidth="3.5"
                strokeDasharray={`${kpi.riskScore}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute tnum text-sm font-bold">{kpi.riskScore}</span>
          </div>
          <span className="text-[12.5px] text-[var(--ink-4)] leading-snug">
            {kpi.riskScore > 50 ? "High Risk" : kpi.riskScore > 20 ? "Elevated" : "Healthy"}
          </span>
        </div>
      </div>

      {/* 4. Remediation Rate */}
      <div className="nt-card p-5 flex flex-col justify-between">
        <div className="text-[11.5px] font-semibold text-[var(--ink-3)] uppercase tracking-wider">Remediation Rate</div>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="tnum text-3xl font-bold tracking-tight">{kpi.remediationRate}%</span>
            <span className="text-[12px] text-[var(--ok)] font-semibold">{kpi.resolved} fixed</span>
          </div>
          <div className="w-full h-2 bg-[var(--line)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--ok)] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${kpi.remediationRate}%` }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
