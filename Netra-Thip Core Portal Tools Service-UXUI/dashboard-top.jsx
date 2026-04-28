// Dashboard content — Hero, KPI cards, Risk donut, Recent Scans table

// ─── Mini sparkline ─────────────────────────────────────────────────────────
const Sparkline = ({ data, color = 'var(--nt-blue)', width = 92, height = 28, fill = true }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - 2 - ((v - min) / span) * (height - 4)]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const fillPath = `${path} L${width},${height} L0,${height} Z`;
  const id = React.useId();
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={fillPath} fill={`url(#${id})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={color} />
    </svg>
  );
};

// ─── Hero strip ─────────────────────────────────────────────────────────────
const Hero = ({ onNewScan }) => {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  return (
    <section className="dot-grid" style={{
      position: 'relative',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--line)',
      background: 'var(--surface)',
      padding: '20px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 24, overflow: 'hidden',
    }}>
      {/* Glow accent */}
      <div style={{
        position: 'absolute', right: -60, top: -60,
        width: 240, height: 240, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,102,255,0.18) 0%, rgba(0,102,255,0) 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em',
          color: 'var(--nt-blue)', marginBottom: 6,
        }}>
          <span className="pulse-dot" style={{ color: 'var(--nt-blue)' }} />
          OPERATIONS · LIVE
        </div>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em',
          color: 'var(--ink)',
          fontFamily: "'Prompt', var(--font-sans)",
        }}>
          สวัสดี Aroon. <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>Welcome back to Netra-Thip.</span>
        </h1>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          fontSize: 12, color: 'var(--ink-3)', marginTop: 6, flexWrap: 'wrap',
        }}>
          <span><span className="mono tnum">6</span> active scans</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-4)' }} />
          <span>Last engine sync <span className="mono">14m</span> ago</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-4)' }} />
          <span className="mono tnum" style={{ color: 'var(--ink-2)' }}>
            {hh}:{mm}:<span style={{ color: 'var(--nt-blue)' }}>{ss}</span> ICT
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
        <button className="btn btn-lg">
          <Icon name="download" size={14} />
          Import findings
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNewScan}>
          <Icon name="plus" size={14} stroke={2} />
          New Scan
          <span style={{
            marginLeft: 4, padding: '2px 5px', borderRadius: 4,
            background: 'rgba(255,255,255,0.18)', fontSize: 10, fontWeight: 600,
            fontFamily: 'var(--font-mono)',
          }}>N</span>
        </button>
      </div>
    </section>
  );
};

// ─── KPI Cards ──────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, unit, delta, deltaKind, accent, sparkData, sparkColor, footer }) => {
  return (
    <div className="nt-card" style={{
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative', overflow: 'hidden',
      minWidth: 0,
    }}>
      {/* Top accent strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: accent, opacity: 0.9,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em',
          color: 'var(--ink-3)', textTransform: 'uppercase',
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 6,
            background: `color-mix(in oklab, ${accent} 14%, transparent)`,
            color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={icon} size={13} stroke={1.8} />
          </span>
          {label}
        </div>
        <button className="btn-ghost" style={{
          width: 22, height: 22, border: 0, borderRadius: 5,
          background: 'transparent', color: 'var(--ink-4)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="more" size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
          <span className="tnum" style={{
            fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em',
            color: 'var(--ink)', fontFamily: 'var(--font-sans)',
          }}>{value}</span>
          {unit && <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>{unit}</span>}
        </div>
        {sparkData && <Sparkline data={sparkData} color={sparkColor || accent} />}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--ink-3)',
      }}>
        {delta && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: deltaKind === 'up-bad' ? 'var(--sev-critical)' :
                   deltaKind === 'up-good' ? 'var(--ok)' :
                   deltaKind === 'down-good' ? 'var(--ok)' :
                   deltaKind === 'down-bad' ? 'var(--sev-critical)' : 'var(--ink-3)',
            fontWeight: 600,
          }}>
            <Icon name={deltaKind?.startsWith('up') ? 'trendUp' : 'trendDown'} size={12} stroke={2} />
            {delta}
          </span>
        )}
        {footer && <span>{footer}</span>}
      </div>
    </div>
  );
};

const KpiRow = () => {
  const cards = [
    {
      icon: 'scan', label: 'Total Scans',
      value: '1,284', delta: '+12 this week', deltaKind: 'up-good',
      accent: 'var(--nt-blue)',
      sparkData: [12,18,14,22,19,28,24,32,29,35,40,38,44],
      footer: 'across 47 targets',
    },
    {
      icon: 'alert', label: 'Critical Vulns',
      value: '47', delta: '+8 since Mon', deltaKind: 'up-bad',
      accent: 'var(--sev-critical)',
      sparkData: [22,28,31,35,30,34,36,38,40,42,45,46,47],
      sparkColor: 'var(--sev-critical)',
      footer: '12 unassigned',
    },
    {
      icon: 'bug', label: 'High Vulns',
      value: '173', delta: '−6 vs last wk', deltaKind: 'down-good',
      accent: 'var(--sev-high)',
      sparkData: [180,182,179,185,178,176,180,177,174,176,175,174,173],
      sparkColor: 'var(--sev-high)',
      footer: '94 in remediation',
    },
    {
      icon: 'zap', label: 'Active Tools',
      value: '6', unit: '/ 12', delta: '4 in queue', deltaKind: 'neutral',
      accent: 'var(--nt-cyan)',
      sparkData: [3,4,3,5,6,5,7,6,5,6,7,6,6],
      sparkColor: 'var(--nt-cyan)',
      footer: 'avg load 38%',
    },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 14,
    }}>
      {cards.map((c, i) => <KpiCard key={i} {...c} />)}
    </div>
  );
};

window.Hero = Hero;
window.KpiRow = KpiRow;
window.Sparkline = Sparkline;
