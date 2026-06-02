import { Severity } from "@prisma/client";
import { Icon } from "@/components/icons/Icon";

interface ComplianceData {
  framework: string;
  label: string;
  count: number;
  severity: Severity;
}

interface CompliancePanelProps {
  data: ComplianceData[];
  totalFindings: number;
}

export function CompliancePanel({ data, totalFindings }: CompliancePanelProps) {
  return (
    <div className="nt-card p-5 h-full flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-[13.5px] font-bold text-[var(--ink)]">Compliance Mapping</h3>
          <p className="text-[11.5px] text-[var(--ink-4)] mt-1">Findings mapped to OWASP Top 10 (2021)</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
        {data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--ink-4)] text-[12px] h-full py-10">
            <Icon name="shield" size={24} className="mb-2 opacity-50" />
            <p>No compliance data mapped yet</p>
          </div>
        ) : (
          data.map((item, idx) => {
            // Determine color based on highest severity
            let colorVar = "var(--ink-4)";
            if (item.severity === "CRITICAL") colorVar = "var(--sev-critical)";
            else if (item.severity === "HIGH") colorVar = "var(--sev-high)";
            else if (item.severity === "MEDIUM") colorVar = "var(--sev-medium)";
            else if (item.severity === "LOW") colorVar = "var(--sev-low)";

            const percentage = totalFindings > 0 ? (item.count / totalFindings) * 100 : 0;

            return (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-[12px]">
                  <span className="font-semibold text-[var(--ink-2)] truncate max-w-[220px]" title={item.label}>
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="tnum font-bold">{item.count}</span>
                    <span className="text-[10px] text-[var(--ink-4)] w-[32px] text-right">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[var(--line-2)] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ 
                      width: `${Math.max(percentage, 2)}%`, 
                      backgroundColor: colorVar 
                    }} 
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
