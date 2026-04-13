export default function Toggle({ value, onChange, label, sublabel }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}
      onClick={() => onChange(!value)}
    >
      <div style={{ flex: 1, cursor: 'pointer' }}>
        <div style={{
          fontSize: '0.875rem', fontWeight: 700,
          color: value ? 'var(--text)' : 'var(--text-dim)',
          marginBottom: 3,
          transition: 'color 0.2s',
        }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {sublabel}
          </div>
        )}
      </div>
      <div
        className={`toggle-track${value ? ' on' : ''}`}
        role="switch"
        aria-checked={value}
        style={{ marginTop: 2 }}
      >
        <div className="toggle-thumb" />
      </div>
    </div>
  )
}
