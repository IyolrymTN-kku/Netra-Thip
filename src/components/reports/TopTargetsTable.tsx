import { Severity } from "@prisma/client";

interface TargetData {
  target: string;
  count: number;
  maxSeverity: Severity;
}

interface TopTargetsTableProps {
  targets: TargetData[];
}

export function TopTargetsTable({ targets }: TopTargetsTableProps) {
  return (
    <div className="nt-card p-0 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-[var(--line)]">
        <h3 className="text-[13.5px] font-bold text-[var(--ink)]">Top 10 Vulnerable Targets</h3>
        <p className="text-[11.5px] text-[var(--ink-4)] mt-1">Assets with the most findings</p>
      </div>

      {targets.length === 0 ? (
        <div className="p-8 text-center text-[12.5px] text-[var(--ink-4)]">
          No targets with findings.
        </div>
      ) : (
        <table className="w-full text-[12.5px] text-left border-collapse">
          <thead className="bg-[var(--surface-2)] text-[10.5px] font-bold text-[var(--ink-3)] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 border-b border-[var(--line)]">Target</th>
              <th className="px-4 py-2 border-b border-[var(--line)] w-[100px] text-right">Findings</th>
              <th className="px-4 py-2 border-b border-[var(--line)] w-[120px]">Max Severity</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t, idx) => (
              <tr key={idx} className="hover:bg-[var(--hover)] border-b border-[var(--line)] last:border-0 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="mono text-[12px] font-medium text-[var(--ink-2)] truncate max-w-[300px] inline-block align-middle">
                    {t.target}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="tnum font-bold text-[var(--ink)]">{t.count}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`chip sev-${t.maxSeverity.toLowerCase()}`}>
                    {t.maxSeverity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
