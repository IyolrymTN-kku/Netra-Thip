"use client";

import { signOut } from "next-auth/react";
import { Icon } from "@/components/icons/Icon";

interface TopNavProps {
  user: { name: string | null; email: string; role: string };
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

function initials(input: string): string {
  return input
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function TopNav({ user, theme, onToggleTheme }: TopNavProps) {
  const displayName = user.name?.trim() || user.email;
  const avatar = initials(displayName);

  return (
    <header
      style={{
        gridArea: "nav",
        height: 56,
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 4,
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ink-3)",
          fontSize: 12.5,
        }}
      >
        <Icon name="activity" size={14} />
        <span>Operate</span>
        <Icon name="chevronRight" size={12} />
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>Dashboard</span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: "min(520px, 50vw)",
            height: 34,
            padding: "0 10px 0 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--ink-3)",
            fontSize: 12.5,
          }}
        >
          <Icon name="search" size={14} />
          <span>Search scans, findings, CVEs, targets…</span>
          <span style={{ flex: 1 }} />
          <kbd
            className="mono"
            style={{
              fontSize: 10.5,
              padding: "2px 5px",
              borderRadius: 4,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink-3)",
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" className="btn btn-sm" style={{ gap: 6 }}>
          <Icon name="sparkles" size={13} />
          <span>AI Keys</span>
          <span
            className="chip"
            style={{
              height: 16,
              padding: "0 5px",
              fontSize: 9.5,
              background: "rgba(16,185,129,0.12)",
              color: "var(--ok)",
            }}
          >
            3 active
          </span>
        </button>
        <span
          style={{
            width: 1,
            height: 22,
            background: "var(--line)",
            margin: "0 4px",
          }}
        />
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          aria-label="Toggle theme"
          style={{
            width: 32,
            height: 32,
            border: 0,
            borderRadius: 7,
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-2)",
          }}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          style={{
            width: 32,
            height: 32,
            border: 0,
            borderRadius: 7,
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-2)",
            position: "relative",
          }}
        >
          <Icon name="bell" size={15} />
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--sev-critical)",
              border: "1.5px solid var(--surface)",
            }}
          />
        </button>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          style={{
            height: 34,
            padding: "0 4px 0 8px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: 0,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              lineHeight: 1.15,
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {displayName}
            </span>
            <span style={{ fontSize: 10, color: "var(--ink-3)" }}>
              {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
            </span>
          </div>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background:
                "linear-gradient(135deg, #1a3358 0%, #0066FF 100%)",
              color: "#fff",
              fontSize: 11.5,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--line)",
            }}
          >
            {avatar}
          </div>
        </button>
      </div>
    </header>
  );
}
