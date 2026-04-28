// New Scan launcher — tool picker grid + side form panel + run summary

const ToolCard = ({ tool, selected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="nt-card"
      style={{
        textAlign: 'left', cursor: 'pointer', padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
        position: 'relative', overflow: 'hidden',
        border: selected ? `1.5px solid ${tool.color}` : '1px solid var(--line)',
        background: selected ? `color-mix(in oklab, ${tool.color} 6%, var(--surface))` : 'var(--surface)',
        boxShadow: selected ? `0 0 0 3px color-mix(in oklab, ${tool.color} 18%, transparent), var(--shadow-sm)` : 'var(--shadow-sm)',
        transition: 'all 180ms cubic-bezier(.2,.7,.2,1)',
        transform: selected ? 'translateY(-1px)' : 'none',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = 'var(--ink-4)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = 'var(--line)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 9,
          background: `linear-gradient(135deg, ${tool.color}, color-mix(in oklab, ${tool.color} 60%, #000))`,
          color: '#fff', fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          boxShadow: `0 4px 12px color-mix(in oklab, ${tool.color} 35%, transparent)`,
        }}>{tool.glyph}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{tool.name}</span>
            {tool.cat && CAT_META[tool.cat] && (
              <span className="chip" style={{
                height: 16, padding: '0 6px', fontSize: 9.5, letterSpacing: '0.06em',
                background: `color-mix(in oklab, ${CAT_META[tool.cat].color} 14%, transparent)`,
                color: CAT_META[tool.cat].color,
              }}>{CAT_META[tool.cat].label}</span>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
            {tool.category} · <span className="mono">{tool.runtime}</span>
          </div>
        </div>
        {selected && (
          <span style={{
            width: 18, height: 18, borderRadius: '50%', background: tool.color,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check" size={11} stroke={2.6} />
          </span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.45, textWrap: 'pretty' }}>
        {tool.tagline}
      </div>
    </button>
  );
};

function NewScanLauncher({ onClose, onRun }) {
  const [selectedId, setSelectedId] = React.useState('autopentestx');
  const [values, setValues] = React.useState({});
  const tool = TOOLS.find(t => t.id === selectedId);

  const setVal = (id, v) => setValues(prev => ({ ...prev, [tool.id]: { ...(prev[tool.id] || {}), [id]: v } }));
  const vals = values[tool.id] || {};

  const requiredOk = tool.fields.filter(f => f.required).every(f => {
    const v = vals[f.id] ?? f.default;
    return v !== undefined && v !== null && v !== '';
  });

  return (
    <div className="nt-fade-in" style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: 16,
      minHeight: 'calc(100vh - 56px - 36px)',
    }}>
      {/* LEFT: Tool picker */}
      <aside style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        position: 'sticky', top: 18, alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 90px)', overflow: 'auto', paddingRight: 4,
      }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }}>
            STEP 1 · Select tool
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            <span className="mono tnum">{TOOLS.length}</span> tools available
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TOOLS.map(t => (
            <ToolCard key={t.id} tool={t} selected={t.id === selectedId} onClick={() => setSelectedId(t.id)} />
          ))}
        </div>
      </aside>

      {/* RIGHT: Form */}
      <div className="nt-card nt-scale-in" style={{
        padding: 0, display: 'flex', flexDirection: 'column', minWidth: 0,
        overflow: 'hidden',
      }} key={tool.id}>
        {/* Tool header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--line)',
          background: `linear-gradient(135deg, color-mix(in oklab, ${tool.color} 8%, var(--surface)) 0%, var(--surface) 60%)`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{
            width: 48, height: 48, borderRadius: 12,
            background: `linear-gradient(135deg, ${tool.color}, color-mix(in oklab, ${tool.color} 55%, #000))`,
            color: '#fff', fontSize: 18, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            boxShadow: `0 8px 24px color-mix(in oklab, ${tool.color} 35%, transparent)`,
          }}>{tool.glyph}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                {tool.name}
              </h2>
              <span className="chip" style={{
                background: `color-mix(in oklab, ${tool.color} 14%, transparent)`,
                color: tool.color,
              }}>{tool.category}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                runtime <span className="mono">{tool.runtime}</span>
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, textWrap: 'pretty' }}>
              {tool.desc}
            </div>
          </div>
          <button className="btn-ghost" style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            width: 32, height: 32, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)',
          }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Form body */}
        <div style={{ padding: '22px 24px', overflow: 'auto', flex: 1 }} key={tool.id + '-form'}>
          <DynamicForm tool={tool} values={vals} onChange={setVal} />
        </div>

        {/* Footer / actions */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--line)',
          background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5, color: 'var(--ink-3)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="lock" size={12} />
              BYOK keys are encrypted in-flight & never written to disk
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-4)' }} />
            <span>
              <span className="mono tnum">{tool.fields.filter(f => f.required).length}</span> required
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn">Save as template</button>
            <button
              className="btn btn-primary"
              disabled={!requiredOk}
              style={{ opacity: requiredOk ? 1 : 0.5, cursor: requiredOk ? 'pointer' : 'not-allowed' }}
              onClick={() => onRun?.(tool, vals)}
            >
              <Icon name="play" size={12} stroke={2.4} />
              Run scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.NewScanLauncher = NewScanLauncher;
