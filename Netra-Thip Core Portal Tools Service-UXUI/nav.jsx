// Top navbar + collapsible left rail for Netra-Thip Core Portal

const NavRail = ({ collapsed, onToggle, active = 'dashboard' }) => {
  const groups = [
  {
    label: 'OPERATE',
    items: [
    { id: 'dashboard', icon: 'activity', label: 'Dashboard' },
    { id: 'scans', icon: 'scan', label: 'Scans', badge: 6 },
    { id: 'findings', icon: 'bug', label: 'Findings', badge: 47, badgeKind: 'critical' },
    { id: 'targets', icon: 'target', label: 'Targets' }]

  },
  {
    label: 'TOOLS',
    items: [
    { id: 'va', icon: 'shield', label: 'VA Scans' },
    { id: 'pentest', icon: 'zap', label: 'Pentest' },
    { id: 'recon', icon: 'network', label: 'Recon' },
    { id: 'reports', icon: 'layers', label: 'Reports' }]

  },
  {
    label: 'MANAGE',
    items: [
    { id: 'engagements', icon: 'database', label: 'Engagements' },
    { id: 'team', icon: 'user', label: 'Team' },
    { id: 'audit', icon: 'lock', label: 'Audit Log' }]

  }];


  return (
    <aside style={{
      gridArea: 'rail',
      borderRight: '1px solid var(--line)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 5
    }}>
      {/* Brand */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0' : '0 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 10, borderBottom: '1px solid var(--line)', fontFamily: "Inter"
      }}>
        <NetraLogo size={26} />
        {!collapsed &&
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
            <span style={{ fontFamily: "'Prompt', var(--font-sans)", fontWeight: 700, fontSize: 13.5, letterSpacing: '0.01em' }}>
              เนตรทิพย์ <span style={{ color: 'var(--nt-blue)' }}>·</span> NETRA
            </span>
            <span style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.18em', fontWeight: 600 }}>
              CORE PORTAL · TOOLS
            </span>
          </div>
        }
      </div>

      {/* Workspace pill */}
      {!collapsed &&
      <div style={{ padding: '12px 12px 6px' }}>
          <button className="btn" style={{
          width: '100%', justifyContent: 'space-between', height: 36,
          background: 'var(--surface-2)', borderColor: 'var(--line)'
        }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'linear-gradient(135deg, var(--nt-blue), var(--nt-cyan))',
              color: '#fff', fontSize: 10.5, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>NT</span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>NT-Core / Prod</span>
                <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>workspace · 47 assets</span>
              </span>
            </span>
            <Icon name="chevronDown" size={14} />
          </button>
        </div>
      }

      {/* Nav groups */}
      <nav style={{ flex: 1, overflow: 'auto', padding: '8px 8px 12px' }}>
        {groups.map((g, gi) =>
        <div key={g.label} style={{ marginTop: gi === 0 ? 0 : 14 }}>
            {!collapsed &&
          <div style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em',
            color: 'var(--ink-4)', padding: '6px 10px 4px'
          }}>{g.label}</div>
          }
            {g.items.map((it) => {
            const isActive = it.id === active;
            return (
              <button
                key={it.id}
                className="btn-ghost"
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: 10, width: '100%',
                  padding: collapsed ? '0' : '0 10px',
                  height: 32, borderRadius: 7,
                  background: isActive ? 'var(--nt-blue-50)' : 'transparent',
                  color: isActive ? 'var(--nt-blue)' : 'var(--ink-2)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 12.5, textAlign: 'left',
                  border: 0, cursor: 'pointer',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {if (!isActive) e.currentTarget.style.background = 'var(--hover)';}}
                onMouseLeave={(e) => {if (!isActive) e.currentTarget.style.background = 'transparent';}}>
                
                  {isActive && !collapsed &&
                <span style={{
                  position: 'absolute', left: -8, top: 6, bottom: 6, width: 2,
                  background: 'var(--nt-blue)', borderRadius: 2
                }} />
                }
                  <Icon name={it.icon} size={15} stroke={1.6} />
                  {!collapsed &&
                <>
                      <span style={{ flex: 1 }}>{it.label}</span>
                      {it.badge &&
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 999,
                    background: it.badgeKind === 'critical' ? 'rgba(225,29,72,0.12)' : 'var(--surface-3)',
                    color: it.badgeKind === 'critical' ? 'var(--sev-critical)' : 'var(--ink-3)'
                  }}>{it.badge}</span>
                  }
                    </>
                }
                </button>);

          })}
          </div>
        )}
      </nav>

      {/* Footer status */}
      {!collapsed &&
      <div style={{
        padding: '10px 14px', borderTop: '1px solid var(--line)',
        fontSize: 10.5, color: 'var(--ink-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="pulse-dot" style={{ color: 'var(--ok)' }} />
            <span>Engine online</span>
          </span>
          <span className="mono">v2.4.1</span>
        </div>
      }

      {/* Collapse handle */}
      <button
        onClick={onToggle}
        title={collapsed ? 'Expand' : 'Collapse'}
        style={{
          position: 'absolute', top: 16, right: -10, zIndex: 10,
          width: 20, height: 20, borderRadius: '50%',
          border: '1px solid var(--line)', background: 'var(--surface)',
          color: 'var(--ink-3)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}>
        
        <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={12} />
      </button>
    </aside>);

};

const TopNav = ({ onToggleTheme, theme, onToggleRail }) => {
  return (
    <header style={{
      gridArea: 'nav',
      height: 56,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center',
      padding: '0 18px', gap: 12,
      position: 'sticky', top: 0, zIndex: 4
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 12.5 }}>
        <Icon name="activity" size={14} />
        <span>Operate</span>
        <Icon name="chevronRight" size={12} />
        <span style={{ color: 'var(--ink), fontWeight: 600' }}>Dashboard</span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 'min(520px, 50vw)',
          height: 34, padding: '0 10px 0 12px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 8,
          color: 'var(--ink-3)', fontSize: 12.5
        }}>
          <Icon name="search" size={14} />
          <span>Search scans, findings, CVEs, targets…</span>
          <span style={{ flex: 1 }} />
          <kbd className="mono" style={{
            fontSize: 10.5, padding: '2px 5px', borderRadius: 4,
            background: 'var(--surface)', border: '1px solid var(--line)',
            color: 'var(--ink-3)'
          }}>⌘K</kbd>
        </div>
      </div>

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button className="btn btn-sm" style={{ gap: 6 }}>
          <Icon name="sparkles" size={13} />
          <span>AI Keys</span>
          <span className="chip" style={{
            height: 16, padding: '0 5px', fontSize: 9.5,
            background: 'rgba(16,185,129,0.12)', color: 'var(--ok)'
          }}>3 active</span>
        </button>
        <span style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
        <button className="btn-ghost" style={{
          width: 32, height: 32, border: 0, borderRadius: 7,
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-2)'
        }}
        onClick={onToggleTheme}
        title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
          
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
        </button>
        <button className="btn-ghost" style={{
          width: 32, height: 32, border: 0, borderRadius: 7,
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-2)', position: 'relative'
        }}>
          <Icon name="bell" size={15} />
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--sev-critical)',
            border: '1.5px solid var(--surface)'
          }} />
        </button>
        <button className="btn-ghost" style={{
          height: 34, padding: '0 4px 0 8px', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: 0, cursor: 'pointer'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.15 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>Aroon Suwan</span>
            <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>Pentester · L3</span>
          </div>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #1a3358 0%, #0066FF 100%)',
            color: '#fff', fontSize: 11.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--line)'
          }}>AS</div>
        </button>
      </div>
    </header>);

};

window.NavRail = NavRail;
window.TopNav = TopNav;