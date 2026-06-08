"use client";

import { signOut } from "next-auth/react";
import { Icon } from "@/components/icons/Icon";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface TopNavProps {
  user: { name: string | null; email: string; role: string };
  theme: "light" | "dark";
  onToggleTheme: () => void;
  navCounts?: { scans: number; findings: number; aiKeys: number };
}

function initials(input: string): string {
  return input
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function TopNav({ user, theme, onToggleTheme, navCounts }: TopNavProps) {
  const displayName = user.name?.trim() || user.email;
  const avatar = initials(displayName);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // Dynamic breadcrumb logic
  const segment = pathname?.split('/').filter(Boolean).pop() || "dashboard";
  const currentLabel = segment.charAt(0).toUpperCase() + segment.slice(1);
  
  let parentLabel = "Operate";
  let parentIcon: any = "activity";
  if (['settings', 'audit'].includes(segment)) {
    parentLabel = "Manage";
    parentIcon = "settings";
  } else if (['va', 'pentest', 'recon', 'reports'].includes(segment)) {
    parentLabel = "Tools";
    parentIcon = "shield";
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <Link 
          href="/dashboard" 
          style={{ 
            color: "var(--ink-3)", 
            textDecoration: "none", 
            display: "flex", 
            alignItems: "center", 
            gap: 8,
            transition: "color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.color = "var(--ink)"}
          onMouseOut={(e) => e.currentTarget.style.color = "var(--ink-3)"}
        >
          <Icon name={parentIcon} size={14} />
          <span>{parentLabel}</span>
        </Link>
        <Icon name="chevronRight" size={12} />
        <Link 
          href={pathname || "/"} 
          style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}
        >
          {currentLabel}
        </Link>
      </div>

      {/* Search */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <div
          onClick={() => searchInputRef.current?.focus()}
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
            cursor: "text",
            transition: "border-color 0.2s, box-shadow 0.2s"
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary, #0066FF)";
            e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0, 102, 255, 0.2)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <Icon name="search" size={14} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search scans, findings, CVEs, targets…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--ink)",
              fontSize: 13,
              width: "100%",
            }}
          />
          <kbd
            className="mono"
            style={{
              fontSize: 10.5,
              padding: "2px 5px",
              borderRadius: 4,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink-3)",
              pointerEvents: "none",
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Link href="/settings" className="btn btn-sm" style={{ gap: 6, textDecoration: "none" }}>
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
            {navCounts?.aiKeys ?? 0} active
          </span>
        </Link>
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
