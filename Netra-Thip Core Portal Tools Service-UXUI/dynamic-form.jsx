// Reusable dynamic form + premium UI primitives.
// Renders any field schema from tools-registry.jsx. No external dep — uses
// CSS keyframes for the "framer-like" entry animations.

// ─── Animation helpers ──────────────────────────────────────────────────────
const FADE_KEYFRAMES = `
@keyframes nt-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes nt-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes nt-slide-right { from { opacity: 0; transform: translateX(420px); } to { opacity: 1; transform: translateX(0); } }
@keyframes nt-scale-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
@keyframes nt-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.nt-stagger > * { animation: nt-fade-up 420ms cubic-bezier(.2,.7,.2,1) both; }
.nt-stagger > *:nth-child(1) { animation-delay: 30ms; }
.nt-stagger > *:nth-child(2) { animation-delay: 70ms; }
.nt-stagger > *:nth-child(3) { animation-delay: 110ms; }
.nt-stagger > *:nth-child(4) { animation-delay: 150ms; }
.nt-stagger > *:nth-child(5) { animation-delay: 190ms; }
.nt-stagger > *:nth-child(6) { animation-delay: 230ms; }
.nt-stagger > *:nth-child(n+7) { animation-delay: 270ms; }
.nt-fade-in { animation: nt-fade-in 320ms ease both; }
.nt-slide-right { animation: nt-slide-right 360ms cubic-bezier(.2,.7,.2,1) both; }
.nt-scale-in { animation: nt-scale-in 260ms cubic-bezier(.2,.7,.2,1) both; }

/* Field shell */
.nt-field {
  display: flex; flex-direction: column; gap: 6px; min-width: 0;
}
.nt-field-label {
  display: flex; align-items: baseline; justify-content: space-between;
  font-size: 11.5px; font-weight: 600; color: var(--ink-2);
  letter-spacing: 0.005em;
}
.nt-field-required { color: var(--sev-critical); margin-left: 3px; }
.nt-field-hint { font-size: 10.5px; color: var(--ink-4); }
.nt-input, .nt-select, .nt-textarea {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line-2);
  border-radius: 8px;
  font: 500 12.5px var(--font-sans);
  outline: none;
  transition: all 140ms ease;
}
.nt-input:hover, .nt-select:hover, .nt-textarea:hover { border-color: var(--ink-4); }
.nt-input:focus, .nt-select:focus, .nt-textarea:focus {
  border-color: var(--nt-blue);
  box-shadow: 0 0 0 3px var(--nt-blue-50);
}
.nt-textarea { height: auto; min-height: 76px; padding: 9px 12px; resize: vertical; line-height: 1.5; }
.nt-input.mono { font-family: var(--font-mono); font-size: 12px; }
.nt-input::placeholder, .nt-textarea::placeholder { color: var(--ink-4); }

.nt-secret {
  position: relative;
}
.nt-secret-toggle {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  height: 26px; padding: 0 8px; border: 0; border-radius: 5px;
  background: transparent; color: var(--ink-3); cursor: pointer;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em;
  display: inline-flex; align-items: center; gap: 4px;
}
.nt-secret-toggle:hover { background: var(--hover); color: var(--ink); }
.nt-secret-strip {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--nt-blue), var(--nt-cyan));
  border-radius: 8px 0 0 8px;
}

.nt-file {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 14px;
  background: var(--surface);
  border: 1.5px dashed var(--line-2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 140ms ease;
}
.nt-file:hover { border-color: var(--nt-blue); background: var(--nt-blue-50); }
.nt-file.has-file { border-style: solid; border-color: var(--ok); background: rgba(16,185,129,0.06); }

.nt-toggle-track {
  position: relative; width: 36px; height: 20px;
  border-radius: 999px; background: var(--line-2);
  cursor: pointer; transition: background 160ms;
  flex-shrink: 0;
}
.nt-toggle-track[data-on="true"] { background: var(--nt-blue); }
.nt-toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: left 160ms cubic-bezier(.5,1.6,.4,1);
}
.nt-toggle-track[data-on="true"] .nt-toggle-thumb { left: 18px; }

.nt-chip-opt {
  display: inline-flex; align-items: center; gap: 6px;
  height: 28px; padding: 0 11px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  color: var(--ink-2);
  font-size: 12px; font-weight: 500;
  cursor: pointer;
  transition: all 140ms;
}
.nt-chip-opt:hover { border-color: var(--ink-4); }
.nt-chip-opt[data-on="true"] {
  background: var(--nt-blue-50);
  border-color: var(--nt-blue);
  color: var(--nt-blue);
  font-weight: 600;
}
`;

if (!document.getElementById('nt-form-styles')) {
  const s = document.createElement('style');
  s.id = 'nt-form-styles';
  s.textContent = FADE_KEYFRAMES;
  document.head.appendChild(s);
}

// ─── Field components ───────────────────────────────────────────────────────
function FieldShell({ field, children }) {
  return (
    <div className="nt-field">
      <label className="nt-field-label">
        <span>
          {field.label}
          {field.required && <span className="nt-field-required">*</span>}
        </span>
        {field.hint && <span className="nt-field-hint">{field.hint}</span>}
      </label>
      {children}
    </div>
  );
}

function TextField({ field, value, onChange }) {
  const mono = field.type === 'ip' || field.type === 'url';
  return (
    <FieldShell field={field}>
      <input
        type="text"
        className={'nt-input' + (mono ? ' mono' : '')}
        placeholder={field.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

function NumberField({ field, value, onChange }) {
  return (
    <FieldShell field={field}>
      <input
        type="number"
        className="nt-input mono"
        min={field.min} max={field.max}
        value={value ?? field.default ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </FieldShell>
  );
}

function TextareaField({ field, value, onChange }) {
  return (
    <FieldShell field={field}>
      <textarea
        className="nt-textarea mono"
        placeholder={field.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </FieldShell>
  );
}

function SelectField({ field, value, onChange }) {
  const v = value ?? field.default;
  if (field.options.length <= 4) {
    return (
      <FieldShell field={field}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {field.options.map(opt => (
            <button
              key={opt}
              type="button"
              className="nt-chip-opt"
              data-on={v === opt}
              onClick={() => onChange(opt)}
            >{opt}</button>
          ))}
        </div>
      </FieldShell>
    );
  }
  return (
    <FieldShell field={field}>
      <div style={{ position: 'relative' }}>
        <select
          className="nt-select"
          value={v || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ appearance: 'none', paddingRight: 32 }}
        >
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--ink-3)', pointerEvents: 'none',
        }}>
          <Icon name="chevronDown" size={14} />
        </span>
      </div>
    </FieldShell>
  );
}

function MultiSelectField({ field, value, onChange }) {
  const v = value || field.default || [];
  const toggle = (opt) => {
    if (v.includes(opt)) onChange(v.filter(x => x !== opt));
    else onChange([...v, opt]);
  };
  return (
    <FieldShell field={field}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {field.options.map(opt => (
          <button
            key={opt}
            type="button"
            className="nt-chip-opt"
            data-on={v.includes(opt)}
            onClick={() => toggle(opt)}
          >
            {v.includes(opt) && <Icon name="check" size={11} stroke={2.4} />}
            {opt}
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

function FileField({ field, value, onChange }) {
  const inputRef = React.useRef(null);
  const file = value;
  return (
    <FieldShell field={field}>
      <div
        className={'nt-file' + (file ? ' has-file' : '')}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onChange({ name: f.name, size: f.size, type: f.type });
        }}
      >
        <span style={{
          width: 36, height: 36, borderRadius: 8,
          background: file ? 'rgba(16,185,129,0.15)' : 'var(--surface-3)',
          color: file ? 'var(--ok)' : 'var(--ink-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name={file ? 'check' : 'download'} size={16} stroke={file ? 2.4 : 1.6} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {file ? (
            <>
              <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>
                {(file.size / 1024).toFixed(1)} KB · ready to upload
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>
                Drop file or click to browse
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>
                Accepts <span className="mono">{field.accept || 'any'}</span>
              </div>
            </>
          )}
        </div>
        {file && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ height: 24, fontSize: 10.5 }}
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
          >Remove</button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={field.accept}
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange({ name: f.name, size: f.size, type: f.type });
          }}
        />
      </div>
    </FieldShell>
  );
}

function SecretField({ field, value, onChange }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <FieldShell field={field}>
      <div className="nt-secret" style={{ position: 'relative' }}>
        <span className="nt-secret-strip" />
        <input
          type={visible ? 'text' : 'password'}
          className="nt-input mono"
          placeholder={field.placeholder || '••••••••••••'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingLeft: 14, paddingRight: 84 }}
          autoComplete="off"
        />
        <button
          type="button"
          className="nt-secret-toggle"
          onClick={() => setVisible(v => !v)}
        >
          <Icon name={visible ? 'x' : 'lock'} size={12} />
          {visible ? 'HIDE' : 'SHOW'}
        </button>
      </div>
    </FieldShell>
  );
}

function ToggleField({ field, value, onChange }) {
  const v = value ?? field.default ?? false;
  return (
    <div className="nt-field" style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', borderRadius: 8,
      background: 'var(--surface-2)', border: '1px solid var(--line)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{field.label}</span>
        {field.hint && <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{field.hint}</span>}
      </div>
      <div
        className="nt-toggle-track"
        data-on={v}
        onClick={() => onChange(!v)}
      >
        <div className="nt-toggle-thumb" />
      </div>
    </div>
  );
}

function renderField(field, value, onChange) {
  switch (field.type) {
    case 'text': case 'url': case 'ip': return <TextField field={field} value={value} onChange={onChange} />;
    case 'number': return <NumberField field={field} value={value} onChange={onChange} />;
    case 'textarea': return <TextareaField field={field} value={value} onChange={onChange} />;
    case 'select': return <SelectField field={field} value={value} onChange={onChange} />;
    case 'multiselect': return <MultiSelectField field={field} value={value} onChange={onChange} />;
    case 'file': return <FileField field={field} value={value} onChange={onChange} />;
    case 'secret': return <SecretField field={field} value={value} onChange={onChange} />;
    case 'toggle': return <ToggleField field={field} value={value} onChange={onChange} />;
    default: return null;
  }
}

function DynamicForm({ tool, values, onChange }) {
  // honor hideWhen rules
  const visible = tool.fields.filter(f => {
    if (!f.hideWhen) return true;
    const v = values[f.hideWhen.field] ?? tool.fields.find(x => x.id === f.hideWhen.field)?.default;
    return v !== f.hideWhen.equals;
  });
  const groups = {};
  visible.forEach(f => {
    const g = f.group || 'General';
    groups[g] = groups[g] || [];
    groups[g].push(f);
  });
  return (
    <div className="nt-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {Object.entries(groups).map(([gname, fields]) => (
        <fieldset key={gname} style={{
          border: 0, padding: 0, margin: 0,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <legend style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
            color: 'var(--ink-3)', textTransform: 'uppercase',
            padding: 0, marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          }}>
            <span>{gname}</span>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </legend>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}>
            {fields.map(f => (
              <div key={f.id} style={{
                gridColumn: ['textarea', 'file', 'multiselect'].includes(f.type) ? '1 / -1' : 'auto',
              }}>
                {renderField(f, values[f.id], (v) => onChange(f.id, v))}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

window.DynamicForm = DynamicForm;
