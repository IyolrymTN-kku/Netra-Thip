"use client";

import { signOut } from "next-auth/react";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/Icon";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);
  const previousUnreadCount = useRef(-1);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifs = () => {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          if (d.notifications) {
            const unread = d.notifications.filter((n: any) => !n.isRead).length;
            if (previousUnreadCount.current !== -1 && unread > previousUnreadCount.current) {
              const newest = d.notifications[0];
              if (newest && !newest.isRead) {
                const cleanMsg = String(newest.message || "").replace(/\s*\[line\s+\d+\]\s*$/i, "");
                setToast({ title: newest.title, message: cleanMsg });
                try {
                  // Using an official Google UI notification sound (safe, clean, standard)
                  const audio = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg");
                  audio.volume = 0.5;
                  audio.play().catch(() => {});
                } catch(e) {}
                setTimeout(() => setToast(null), 5000);
              }
            }
            previousUnreadCount.current = unread;
            setNotifications(d.notifications);
          }
        })
        .catch(console.error);
    };
    
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    });
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div ref={bellRef} style={{ position: "relative" }}>
      {toast && (
        <div style={{
          position: "fixed",
          top: 70, // Moved to top right, just below header
          right: 24,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderLeft: "4px solid var(--sev-critical)",
          borderRadius: 8,
          padding: "16px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)", // Enhanced shadow to stand out at the top
          zIndex: 9999,
          maxWidth: 320,
          animation: "slideIn 0.3s ease-out"
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 6 }}>{toast.title}</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.4 }}>{toast.message}</div>
        </div>
      )}
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen(!open)}
        style={{
          width: 32,
          height: 32,
          border: open ? "1px solid var(--line)" : 0,
          borderRadius: 7,
          background: open ? "var(--surface-2)" : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-2)",
          position: "relative",
          transition: "all 0.2s"
        }}
      >
        <Icon name="bell" size={15} />
        {unreadCount > 0 && (
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
        )}
      </button>
      
      {open && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            width: 340,
            maxHeight: 400,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 10,
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>Notifications</span>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{ background: "none", border: "none", color: "var(--primary, #0066FF)", fontSize: 11.5, cursor: "pointer" }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 12.5 }}>
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  style={{ 
                    padding: "10px 16px", 
                    display: "flex", 
                    gap: 12,
                    background: n.isRead ? "transparent" : "var(--surface-2)",
                    borderLeft: n.isRead ? "3px solid transparent" : "3px solid var(--primary, #0066FF)"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: n.isRead ? 400 : 600, fontSize: 12.5, color: "var(--ink)" }}>{n.title}</span>
                      <span style={{ fontSize: 10, color: "var(--ink-3)" }}>
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.4 }}>
                      {String(n.message || "").replace(/\s*\[line\s+\d+\]\s*$/i, "")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  let parentIcon: IconName = "activity";
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
        <NotificationBell />
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
