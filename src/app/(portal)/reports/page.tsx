import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons/Icon";

const UPCOMING_FEATURES = [
  {
    icon: "fileText" as const,
    title: "Executive Summary",
    desc: "Auto-generated PDF reports with risk scoring and remediation priorities.",
  },
  {
    icon: "layers" as const,
    title: "Compliance Mapping",
    desc: "Map findings to ISO 27001, NIST, OWASP Top 10, and PCI-DSS controls.",
  },
  {
    icon: "trendUp" as const,
    title: "Trend Analysis",
    desc: "Track vulnerability trends over time with interactive charts and comparisons.",
  },
  {
    icon: "sparkles" as const,
    title: "AI-Driven Insights",
    desc: "AI narrates your security posture and suggests strategic recommendations.",
  },
];

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 180px)",
        gap: 32,
        paddingBottom: 40,
      }}
    >
      {/* Hero */}
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background:
              "linear-gradient(135deg, var(--nt-blue), var(--nt-cyan))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow:
              "0 8px 32px rgba(0, 102, 255, 0.25), 0 2px 8px rgba(0, 217, 255, 0.15)",
          }}
        >
          <Icon name="fileText" size={28} style={{ color: "#fff" }} />
        </div>
        <h1
          className="mono"
          style={{
            fontSize: 26,
            fontWeight: 700,
            margin: "0 0 8px 0",
            color: "var(--ink)",
          }}
        >
          Reports
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "var(--ink-3)",
            lineHeight: 1.6,
          }}
        >
          Comprehensive security reporting with AI-powered analysis. This
          feature is currently under development.
        </p>

        <div
          style={{
            marginTop: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 999,
            background: "var(--nt-blue-50)",
            border: "1px solid rgba(0, 102, 255, 0.15)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--nt-blue)",
          }}
        >
          <span
            className="pulse-dot"
            style={{ color: "var(--nt-blue)" }}
          />
          Coming Soon
        </div>
      </div>

      {/* Upcoming features grid */}
      <div
        className="nt-stagger"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 14,
          maxWidth: 560,
          width: "100%",
        }}
      >
        {UPCOMING_FEATURES.map((f) => (
          <div
            key={f.title}
            className="nt-card"
            style={{
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--surface-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-3)",
              }}
            >
              <Icon name={f.icon} size={16} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>
              {f.title}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
              {f.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
