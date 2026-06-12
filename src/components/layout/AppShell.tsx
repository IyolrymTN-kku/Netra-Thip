"use client";

import { useEffect, useState } from "react";
import { NavRail } from "./NavRail";
import { TopNav } from "./TopNav";

interface AppShellProps {
  user: { name: string | null; email: string; role: string };
  navCounts?: { scans: number; findings: number; aiKeys: number };
  children: React.ReactNode;
}

type Theme = "light" | "dark";

export function AppShell({ user, navCounts, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="nt-app" data-rail={collapsed ? "collapsed" : "expanded"}>
      <NavRail
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        navCounts={navCounts}
      />
      <TopNav
        user={user}
        theme={theme}
        onToggleTheme={() =>
          setTheme((t) => (t === "dark" ? "light" : "dark"))
        }
        navCounts={navCounts}
      />
      <main
        style={{
          gridArea: "main",
          padding: 20,
          overflow: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
