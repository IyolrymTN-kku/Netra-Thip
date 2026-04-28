"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { NetraLogo } from "@/components/icons/NetraLogo";

interface NavItem {
  id: string;
  href: string;
  icon: IconName;
  label: string;
  badge?: number;
  badgeKind?: "critical";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "OPERATE",
    items: [
      { id: "dashboard", href: "/dashboard", icon: "activity", label: "Dashboard" },
      { id: "scans", href: "/scans", icon: "scan", label: "Scans", badge: 6 },
      { id: "findings", href: "/findings", icon: "bug", label: "Findings", badge: 47, badgeKind: "critical" },
      { id: "targets", href: "/targets", icon: "target", label: "Targets" },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { id: "va", href: "/tools/va", icon: "shield", label: "VA Scans" },
      { id: "pentest", href: "/tools/pentest", icon: "zap", label: "Pentest" },
      { id: "recon", href: "/tools/recon", icon: "network", label: "Recon" },
      { id: "reports", href: "/reports", icon: "layers", label: "Reports" },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { id: "engagements", href: "/engagements", icon: "database", label: "Engagements" },
      { id: "team", href: "/team", icon: "user", label: "Team" },
      { id: "audit", href: "/audit", icon: "lock", label: "Audit Log" },
    ],
  },
];

interface NavRailProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function NavRail({ collapsed, onToggle }: NavRailProps) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        gridArea: "rail",
        borderRight: "1px solid var(--line)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 5,
      }}
    >
      {/* Brand */}
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: collapsed ? 0 : "0 14px",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <NetraLogo size={26} />
        {!collapsed && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-thai)",
                fontWeight: 700,
                fontSize: 13.5,
                letterSpacing: "0.01em",
              }}
            >
              เนตรทิพย์{" "}
              <span style={{ color: "var(--nt-blue)" }}>·</span> NETRA
            </span>
            <span
              style={{
                fontSize: 9.5,
                color: "var(--ink-3)",
                letterSpacing: "0.18em",
                fontWeight: 600,
              }}
            >
              CORE PORTAL · TOOLS
            </span>
          </div>
        )}
      </div>

      {/* Workspace pill */}
      {!collapsed && (
        <div style={{ padding: "12px 12px 6px" }}>
          <button
            type="button"
            className="btn"
            style={{
              width: "100%",
              justifyContent: "space-between",
              height: 36,
              background: "var(--surface-2)",
              borderColor: "var(--line)",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background:
                    "linear-gradient(135deg, var(--nt-blue), var(--nt-cyan))",
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                NT
              </span>
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  NT-Core / Prod
                </span>
                <span style={{ fontSize: 10, color: "var(--ink-3)" }}>
                  workspace · 47 assets
                </span>
              </span>
            </span>
            <Icon name="chevronDown" size={14} />
          </button>
        </div>
      )}

      {/* Nav groups */}
      <nav style={{ flex: 1, overflow: "auto", padding: "8px 8px 12px" }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} style={{ marginTop: gi === 0 ? 0 : 14 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "var(--ink-4)",
                  padding: "6px 10px 4px",
                }}
              >
                {group.label}
              </div>
            )}
            {group.items.map((it) => {
              const isActive =
                pathname === it.href || pathname.startsWith(`${it.href}/`);
              return (
                <Link
                  key={it.id}
                  href={it.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: collapsed ? 0 : "0 10px",
                    height: 32,
                    borderRadius: 7,
                    background: isActive
                      ? "var(--nt-blue-50)"
                      : "transparent",
                    color: isActive ? "var(--nt-blue)" : "var(--ink-2)",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 12.5,
                    textDecoration: "none",
                    justifyContent: collapsed ? "center" : "flex-start",
                    position: "relative",
                  }}
                >
                  {isActive && !collapsed && (
                    <span
                      style={{
                        position: "absolute",
                        left: -8,
                        top: 6,
                        bottom: 6,
                        width: 2,
                        background: "var(--nt-blue)",
                        borderRadius: 2,
                      }}
                    />
                  )}
                  <Icon name={it.icon} size={15} stroke={1.6} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{it.label}</span>
                      {typeof it.badge === "number" && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 999,
                            background:
                              it.badgeKind === "critical"
                                ? "rgba(225,29,72,0.12)"
                                : "var(--surface-3)",
                            color:
                              it.badgeKind === "critical"
                                ? "var(--sev-critical)"
                                : "var(--ink-3)",
                          }}
                        >
                          {it.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--line)",
            fontSize: 10.5,
            color: "var(--ink-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span className="pulse-dot" style={{ color: "var(--ok)" }} />
            <span>Engine online</span>
          </span>
          <span className="mono">v2.4.1</span>
        </div>
      )}

      {/* Collapse handle */}
      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? "Expand" : "Collapse"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          position: "absolute",
          top: 16,
          right: -10,
          zIndex: 10,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "1px solid var(--line)",
          background: "var(--surface)",
          color: "var(--ink-3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={12} />
      </button>
    </aside>
  );
}
