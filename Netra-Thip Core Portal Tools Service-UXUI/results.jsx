// Unified Results Dashboard + Finding Detail Drawer (normalized schema)

const SEV_META = {
  CRITICAL: { color: 'var(--sev-critical)', bg: 'rgba(225,29,72,0.10)', label: 'Critical' },
  HIGH:     { color: 'var(--sev-high)',     bg: 'rgba(249,115,22,0.12)', label: 'High' },
  MEDIUM:   { color: '#A47600',             bg: 'rgba(234,179,8,0.16)',  label: 'Medium' },
  LOW:      { color: 'var(--ok)',           bg: 'rgba(16,185,129,0.12)', label: 'Low' },
  INFO:     { color: 'var(--sev-info)',     bg: 'rgba(100,116,139,0.14)',label: 'Info' },
};
const STATUS_META = {
  OPEN:           { color: 'var(--ink-2)',      bg: 'var(--surface-3)',          label: 'Open' },
  CONFIRMED:      { color: 'var(--nt-blue)',    bg: 'var(--nt-blue-50)',         label: 'Confirmed' },
  FALSE_POSITIVE: { color: 'var(--ink-4)',      bg: 'var(--surface-3)',          label: 'False positive', strike: true },
  MITIGATED:      { color: 'var(--ok)',         bg: 'rgba(16,185,129,0.12)',     label: 'Mitigated' },
  RESOLVED:       { color: 'var(--ok)',         bg: 'rgba(16,185,129,0.12)',     label: 'Resolved' },
};
const TOOL_CAT = {
  AutoPentestX: 1, 'Guardian-CLI': 1, VULS: 1,
  Metlo: 2, SiriusScan: 2,
  Caido: 3, 'SILENTCHAIN-AI': 3,
};

function SevBadge({ sev }) {
  const m = SEV_META[sev];
  return (
    <span className="chip" style={{ background: m.bg, color: m.color, height: 20, letterSpacing: '0.06em' }}>
      <span className="chip-dot" style={{ background: 'currentColor' }} />
      {sev}
    </span>
  );
}
function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.OPEN;
  return (
    <span className="chip" style={{
      background: m.bg, color: m.color, height: 20, fontWeight: 600,
      textDecoration: m.strike ? 'line-through' : 'none',
    }}>{m.label}</span>
  );
}
function CvssBar({ score, sev }) {
  if (score == null) return <span style={{ color: 'var(--ink-4)' }}>—</span>;
  const pct = Math.min(100, (score / 10) * 100);
  const color = SEV_META[sev]?.color || 'var(--nt-blue)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 50, height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span className="mono tnum" style={{ fontSize: 11.5, fontWeight: 600 }}>{score.toFixed(1)}</span>
    </div>
  );
}
function ToolBadge({ name }) {
  const cat = TOOL_CAT[name];
  const c = CAT_META[cat]?.color || 'var(--ink-3)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: c }} />
      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)' }}>{name}</span>
    </span>
  );
}
function targetText(t) {
  if (!t) return '—';
  let s = t.host || '';
  if (t.port) s += ':' + t.port;
  if (t.path) s += t.path;
  return s;
}

function ResultsKpi({ label, value, color, icon }) {
  return (
    <div className="nt-card" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: `color-mix(in oklab, ${color} 14%, transparent)`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={13} stroke={1.8} />
        </span>{label}
      </div>
      <div className="tnum" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 8 }}>{value}</div>
    </div>
  );
}
function ResultsDonut({ data, total }) {
  const cx = 70, cy = 70, r = 50, stroke = 14, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        {data.map((d, i) => {
          const len = total ? (d.value / total) * C : 0;
          const off = -acc; acc += len;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={stroke} strokeDasharray={`${len} ${C-len}`} strokeDashoffset={off} />;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="tnum" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{total}</div>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>FINDINGS</div>
      </div>
    </div>
  );
}

function JobStatusBanner({ state, counts }) {
  const map = {
    PENDING:   { color: 'var(--ink-3)',     bg: 'var(--surface-3)',           icon: 'clock',   label: 'Queued — waiting for execution engine' },
    RUNNING:   { color: 'var(--nt-blue)',   bg: 'var(--nt-blue-50)',          icon: 'refresh', label: 'Scanning in progress…' },
    COMPLETED: { color: 'var(--ok)',        bg: 'rgba(16,185,129,0.10)',      icon: 'check',   label: `Scan completed — ${counts.CRITICAL || 0} critical, ${counts.HIGH || 0} high` },
    FAILED:    { color: 'var(--sev-critical)', bg: 'rgba(225,29,72,0.10)',    icon: 'x',       label: 'Execution failed — check n8n logs' },
  };
  const m = map[state] || map.COMPLETED;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: m.bg, color: m.color,
      border: `1px solid color-mix(in oklab, ${m.color} 30%, transparent)`,
      borderRadius: 10, fontSize: 12.5, fontWeight: 600,
    }}>
      {state === 'RUNNING'
        ? <span className="pulse-dot" style={{ color: m.color }} />
        : <Icon name={m.icon} size={14} stroke={2.2} />}
      <span style={{ flex: 1 }}>{m.label}</span>
      {state === 'RUNNING' && (
        <div style={{ width: 200, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{
            width: '40%', height: '100%', background: m.color,
            animation: 'nt-shimmer 1.4s linear infinite',
            backgroundImage: `linear-gradient(90deg, transparent, ${m.color}, transparent)`,
            backgroundSize: '200% 100%',
          }} />
        </div>
      )}
    </div>
  );
}

function FindingsTable({ rows, onSelect, selectedId }) {
  const [sevFilter, setSevFilter] = React.useState('ALL');
  const [toolFilter, setToolFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const tools = ['ALL', ...new Set(rows.map(r => r.toolName))];
  const filtered = rows
    .filter(r => sevFilter === 'ALL' || r.severity === sevFilter)
    .filter(r => toolFilter === 'ALL' || r.toolName === toolFilter)
    .filter(r => statusFilter === 'ALL' || r.status === statusFilter);

  const FilterRow = ({ label, value, options, onChange, render }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: 'var(--ink-4)', textTransform: 'uppercase', marginRight: 4 }}>{label}</span>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} className="nt-chip-opt" data-on={value === o} style={{ height: 24, fontSize: 11 }}>
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="nt-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Findings</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
              <span className="mono tnum">{filtered.length}</span> of <span className="mono tnum">{rows.length}</span>
            </div>
          </div>
          <button className="btn btn-sm"><Icon name="download" size={12} />Export</button>
        </div>
        <FilterRow label="Severity" value={sevFilter} options={['ALL','CRITICAL','HIGH','MEDIUM','LOW']} onChange={setSevFilter} />
        <FilterRow label="Tool"     value={toolFilter} options={tools} onChange={setToolFilter} />
        <FilterRow label="Status"   value={statusFilter} options={['ALL','OPEN','CONFIRMED','MITIGATED']} onChange={setStatusFilter} />
      </div>
      <div style={{ height: 1, background: 'var(--line)' }} />
      <div style={{ overflow: 'auto', maxHeight: 560 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: 'var(--ink-3)', textTransform: 'uppercase', background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
              <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid var(--line)', width: 100 }}>Severity</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>Title</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--line)', width: 130 }}>CVE</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--line)', width: 110 }}>CVSS</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--line)', width: 130 }}>Tool</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--line)', width: 200 }}>Target</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--line)', width: 110 }}>Status</th>
              <th style={{ padding: '8px 16px', textAlign: 'right', borderBottom: '1px solid var(--line)', width: 90 }}>Age</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const sel = r.id === selectedId;
              return (
                <tr key={r.id} onClick={() => onSelect(r)} style={{
                  cursor: 'pointer', background: sel ? 'var(--nt-blue-50)' : 'transparent',
                  borderBottom: '1px solid var(--line)',
                }}
                  onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 16px' }}><SevBadge sev={r.severity} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      {r.isNew && <span className="chip" style={{ height: 16, fontSize: 9.5, background: 'var(--nt-blue-50)', color: 'var(--nt-blue)' }}>NEW</span>}
                      {r.exploitable && <span className="chip sev-critical" style={{ height: 16, fontSize: 9.5 }}>EXPL</span>}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="mono" style={{ fontSize: 11, color: r.cve ? 'var(--ink-2)' : 'var(--ink-4)' }}>{r.cve || '—'}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}><CvssBar score={r.cvss} sev={r.severity} /></td>
                  <td style={{ padding: '10px 12px' }}><ToolBadge name={r.toolName} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{targetText(r.target)}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}><StatusPill status={r.status} /></td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r.firstSeenAt}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FindingDrawer({ finding, onClose, onStatusChange }) {
  const hasHttp = !!(finding?.target?.method || finding?.target?.path);
  const baseTabs = [
    { id: 'evidence',    label: 'Evidence' },
    { id: 'cve',         label: 'CVE' },
    ...(hasHttp ? [{ id: 'http', label: 'HTTP Evidence' }] : []),
    { id: 'remediation', label: 'AI Remediation', sparkle: true },
    { id: 'status',      label: 'Status' },
  ];
  const [tab, setTab] = React.useState('evidence');
  if (!finding) return null;

  const codeBox = (text) => (
    <pre className="mono" style={{
      margin: 0, padding: 14, borderRadius: 8,
      background: 'var(--surface-2)', border: '1px solid var(--line)',
      color: 'var(--ink-2)', fontSize: 11.5, lineHeight: 1.55,
      overflow: 'auto', maxHeight: 320, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>{text || '— no data —'}</pre>
  );

  return (
    <>
      <div className="nt-fade-in" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.34)', backdropFilter: 'blur(2px)', zIndex: 100 }} />
      <aside className="nt-slide-right" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(580px, 92vw)',
        background: 'var(--surface)', borderLeft: '1px solid var(--line)',
        boxShadow: '-12px 0 40px rgba(10,22,40,0.18)', zIndex: 101,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <SevBadge sev={finding.severity} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', textWrap: 'pretty' }}>{finding.title}</div>
              {finding.isNew && <span className="chip" style={{ height: 16, fontSize: 9.5, background: 'var(--nt-blue-50)', color: 'var(--nt-blue)' }}>NEW</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="mono">{finding.id}</span><span>·</span>
              <ToolBadge name={finding.toolName} /><span>·</span>
              <span className="mono">{targetText(finding.target)}</span><span>·</span>
              <span className="mono">{finding.firstSeenAt}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ width: 30, height: 30, border: 0, background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ padding: '0 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 0, overflowX: 'auto' }}>
          {baseTabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              border: 0, background: 'transparent', padding: '12px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              fontSize: 12, fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? 'var(--nt-blue)' : 'var(--ink-3)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--nt-blue)' : 'transparent'}`,
              marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {t.sparkle && <Icon name="sparkles" size={12} />}{t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }} key={tab}>
          <div className="nt-fade-in">
            {tab === 'evidence' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {finding.exploitable && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(225,29,72,0.10)',
                    border: '1px solid color-mix(in oklab, var(--sev-critical) 35%, transparent)',
                    color: 'var(--sev-critical)', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <Icon name="alert" size={14} stroke={2.2} />
                    <span style={{ flex: 1 }}>EXPLOITABLE — Exploit module: <span className="mono">{finding.exploitModule || 'public PoC available'}</span></span>
                  </div>
                )}
                {finding.target?.service && (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    Service · <span className="mono" style={{ color: 'var(--ink-2)' }}>{finding.target.service}</span>
                    {finding.target.port && <> · port <span className="mono" style={{ color: 'var(--ink-2)' }}>{finding.target.port}</span></>}
                  </div>
                )}
                {finding.description && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>{finding.description}</div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>Observed evidence</div>
                {codeBox(finding.evidence)}
              </div>
            )}
            {tab === 'cve' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {finding.cve ? (
                  <>
                    <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{finding.cve}</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }}>CVSS · {finding.cvss?.toFixed(1) ?? '—'}/10</div>
                      <div style={{ height: 10, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${((finding.cvss || 0)/10)*100}%`, height: '100%',
                          background: `linear-gradient(90deg, var(--ok), var(--sev-medium), var(--sev-high), var(--sev-critical))`,
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>
                        <span>0</span><span>4</span><span>7</span><span>9</span><span>10</span>
                      </div>
                    </div>
                    {finding.description && <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>{finding.description}</div>}
                    <a href={`https://nvd.nist.gov/vuln/detail/${finding.cve}`} target="_blank" rel="noreferrer" className="btn" style={{ alignSelf: 'flex-start', textDecoration: 'none' }}>
                      <Icon name="arrowUpRight" size={12} />View on NVD
                    </a>
                  </>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1px dashed var(--line)', borderRadius: 8 }}>
                    No CVE associated with this finding.
                  </div>
                )}
              </div>
            )}
            {tab === 'http' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>HTTP request</div>
                {codeBox(`${finding.target?.method || 'GET'} ${finding.target?.path || '/'} HTTP/1.1\nHost: ${finding.target?.host || ''}\n`)}
                {finding.evidence && <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>Notes</div>
                  {codeBox(finding.evidence)}
                </>}
              </div>
            )}
            {tab === 'remediation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {finding.remediation ? (
                  <>
                    <div style={{
                      padding: 14, borderRadius: 10,
                      background: 'linear-gradient(135deg, color-mix(in oklab, var(--nt-blue) 8%, var(--surface)) 0%, var(--surface) 100%)',
                      border: '1px solid color-mix(in oklab, var(--nt-blue) 25%, var(--line))',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--nt-blue), var(--nt-cyan))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="sparkles" size={14} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>AI-suggested remediation</div>
                        <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>generated by configured project AI provider</div>
                      </div>
                      <button className="btn btn-sm" style={{ height: 26, fontSize: 11 }}>Regenerate</button>
                    </div>
                    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {finding.remediation.split('\n').filter(Boolean).map((step, i) => {
                        const m = step.match(/^(\d+)\.\s*(.*)$/);
                        const n = m ? m[1] : (i + 1);
                        const txt = m ? m[2] : step;
                        return (
                          <li key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8 }}>
                            <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--nt-blue-50)', color: 'var(--nt-blue)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)' }}>{n}</span>
                            <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-2)', textWrap: 'pretty' }}>{txt}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1px dashed var(--line)', borderRadius: 8 }}>
                    AI remediation requires an AI API Key configured for this project — go to Settings &gt; API Keys.
                  </div>
                )}
              </div>
            )}
            {tab === 'status' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--ink-3)' }}>
                  {finding.isNew && <span className="chip" style={{ height: 18, background: 'var(--nt-blue-50)', color: 'var(--nt-blue)' }}>NEW</span>}
                  <span>First seen <span className="mono" style={{ color: 'var(--ink-2)' }}>{finding.firstSeenAt}</span></span>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 8 }}>Update status</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {['OPEN','CONFIRMED','FALSE_POSITIVE','MITIGATED','RESOLVED'].map(s => {
                      const checked = finding.status === s;
                      return (
                        <label key={s} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          background: checked ? 'var(--nt-blue-50)' : 'var(--surface-2)',
                          border: `1px solid ${checked ? 'var(--nt-blue)' : 'var(--line)'}`,
                          borderRadius: 8, cursor: 'pointer',
                        }}>
                          <span style={{
                            width: 14, height: 14, borderRadius: '50%',
                            border: `2px solid ${checked ? 'var(--nt-blue)' : 'var(--line-2)'}`,
                            background: checked ? 'var(--nt-blue)' : 'transparent',
                            boxShadow: checked ? 'inset 0 0 0 3px var(--surface)' : 'none',
                          }} />
                          <StatusPill status={s} />
                          <input type="radio" name="status" checked={checked} onChange={() => onStatusChange?.(s)} style={{ display: 'none' }} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function ResultsDashboard({ runMeta, findings = FINDINGS, onClose }) {
  const [selected, setSelected] = React.useState(null);
  const [jobState, setJobState] = React.useState(runMeta?.jobState || 'COMPLETED');
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  findings.forEach(f => { counts[f.severity] = (counts[f.severity] || 0) + 1; });
  const total = findings.length;
  const donutData = [
    { color: 'var(--sev-critical)', value: counts.CRITICAL },
    { color: 'var(--sev-high)',     value: counts.HIGH },
    { color: '#EAB308',             value: counts.MEDIUM },
    { color: 'var(--ok)',           value: counts.LOW },
  ];
  const meta = runMeta || { tool: 'Aggregate run', target: 'multi-target', duration: '14m 22s', when: 'just now' };

  return (
    <div className="nt-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section className="nt-card dot-grid" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,102,255,0.16), transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, var(--ok), #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}>
              <Icon name="check" size={22} stroke={2.6} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, fontFamily: "'Prompt', var(--font-sans)" }}>
                {meta.tool} <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>· {meta.target}</span>
              </h2>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, display: 'flex', gap: 12 }}>
                <span>finished <span className="mono">{meta.when}</span></span>
                <span>·</span>
                <span>duration <span className="mono">{meta.duration}</span></span>
                <span>·</span>
                <span><span className="mono tnum">{total}</span> findings</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="nt-select" value={jobState} onChange={(e) => setJobState(e.target.value)} style={{ height: 32, fontSize: 11.5 }}>
              <option value="PENDING">PENDING</option>
              <option value="RUNNING">RUNNING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
            </select>
            <button className="btn"><Icon name="download" size={13} />Export PDF</button>
            <button className="btn btn-primary" onClick={onClose}><Icon name="plus" size={13} stroke={2.2} />New scan</button>
          </div>
        </div>
        <JobStatusBanner state={jobState} counts={counts} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr 1fr', gap: 14 }} className="nt-stagger">
        <div className="nt-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <ResultsDonut data={donutData} total={total} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>Severity Mix</div>
            {[
              { k: 'Critical', v: counts.CRITICAL, c: 'var(--sev-critical)' },
              { k: 'High',     v: counts.HIGH,     c: 'var(--sev-high)' },
              { k: 'Medium',   v: counts.MEDIUM,   c: '#EAB308' },
              { k: 'Low',      v: counts.LOW,      c: 'var(--ok)' },
            ].map(r => (
              <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: r.c }} />
                <span style={{ color: 'var(--ink-2)', fontWeight: 500, flex: 1 }}>{r.k}</span>
                <span className="mono tnum" style={{ fontWeight: 600 }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
        <ResultsKpi label="Total Findings" value={total}             color="var(--nt-blue)"     icon="bug" />
        <ResultsKpi label="Critical"       value={counts.CRITICAL}   color="var(--sev-critical)" icon="alert" />
        <ResultsKpi label="High"           value={counts.HIGH}       color="var(--sev-high)"     icon="bug" />
        <ResultsKpi label="Medium"         value={counts.MEDIUM}     color="#EAB308"             icon="shield" />
      </section>

      <FindingsTable rows={findings} onSelect={setSelected} selectedId={selected?.id} />
      {selected && <FindingDrawer finding={selected} onClose={() => setSelected(null)} onStatusChange={(s) => setSelected({ ...selected, status: s })} />}
    </div>
  );
}

window.ResultsDashboard = ResultsDashboard;
