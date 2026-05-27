"use client";

import { useMemo, useState } from "react";
import type { Severity } from "@prisma/client";
import { ResultsKpi } from "./ResultsKpi";
import { ResultsDonut } from "./ResultsDonut";
import { FindingsTable } from "./FindingsTable";
import { FindingDrawer } from "./FindingDrawer";
import type { FindingRow } from "./types";

interface ResultsViewProps {
  findings: FindingRow[];
  mode: "global" | "scan";
}

const SEVERITY_KEYS: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

const SEV_COLOR: Record<Severity, string> = {
  CRITICAL: "var(--sev-critical)",
  HIGH: "var(--sev-high)",
  MEDIUM: "#EAB308",
  LOW: "var(--ok)",
  INFO: "var(--sev-info)",
};

export function ResultsView({ findings: rawFindings, mode }: ResultsViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const findings = rawFindings;

  const counts = useMemo(() => {
    const c: Record<Severity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };
    for (const f of findings) c[f.severity]++;
    return c;
  }, [findings]);

  const total = findings.length;
  const donutData = SEVERITY_KEYS.map((k) => ({
    color: SEV_COLOR[k],
    value: counts[k],
  }));

  const selected = useMemo(
    () => findings.find((f) => f.id === selectedId) ?? null,
    [findings, selectedId],
  );

  return (
    <div
      className="nt-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      {mode === "global" && (
        <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "var(--ink)",
              fontFamily: "var(--font-thai)",
            }}
          >
            Findings
          </h1>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            <span className="mono tnum">{total}</span> total ·{" "}
            <span style={{ color: "var(--sev-critical)" }}>
              <span className="mono tnum">{counts.CRITICAL}</span> critical
            </span>{" "}
            ·{" "}
            <span style={{ color: "var(--sev-high)" }}>
              <span className="mono tnum">{counts.HIGH}</span> high
            </span>
          </div>
        </header>
      )}

      <section
        className="nt-stagger"
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr repeat(6, 1fr)",
          gap: 14,
        }}
      >
        <div
          className="nt-card"
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <ResultsDonut data={donutData} total={total} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.10em",
                color: "var(--ink-3)",
                textTransform: "uppercase",
              }}
            >
              Severity Mix
            </div>
            {SEVERITY_KEYS.map((k) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11.5,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: SEV_COLOR[k],
                  }}
                />
                <span
                  style={{
                    color: "var(--ink-2)",
                    fontWeight: 500,
                    flex: 1,
                  }}
                >
                  {k.charAt(0) + k.slice(1).toLowerCase()}
                </span>
                <span className="mono tnum" style={{ fontWeight: 600 }}>
                  {counts[k]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <ResultsKpi
          label="Total Findings"
          value={total}
          color="var(--nt-blue)"
          icon="bug"
        />
        <ResultsKpi
          label="Critical"
          value={counts.CRITICAL}
          color="var(--sev-critical)"
          icon="alert"
        />
        <ResultsKpi
          label="High"
          value={counts.HIGH}
          color="var(--sev-high)"
          icon="bug"
        />
        <ResultsKpi
          label="Medium"
          value={counts.MEDIUM}
          color="#EAB308"
          icon="shield"
        />
        <ResultsKpi
          label="Low"
          value={counts.LOW}
          color="var(--ok)"
          icon="check"
        />
        <ResultsKpi
          label="Info"
          value={counts.INFO}
          color="var(--sev-info)"
          icon="info"
        />
      </section>

      <FindingsTable
        rows={findings}
        selectedId={selected?.id ?? null}
        onSelect={(r) => setSelectedId(r.id)}
      />

      {selected && (
        <FindingDrawer
          finding={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
