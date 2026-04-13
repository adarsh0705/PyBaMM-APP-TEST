const STEPS = ['Model', 'Experiment', 'Physics', 'Parameters']

export default function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Space Mono, monospace',
                fontSize: done ? '0.8rem' : '0.7rem',
                fontWeight: 700,
                transition: 'all 0.3s',
                background: done
                  ? 'var(--accent-dim)'
                  : active
                    ? 'rgba(0,229,160,0.12)'
                    : 'var(--surface2)',
                color: done ? '#000' : active ? 'var(--accent)' : 'var(--text-muted)',
                border: active
                  ? '1.5px solid var(--accent)'
                  : done
                    ? '1.5px solid var(--accent-dim)'
                    : '1.5px solid var(--border)',
                boxShadow: active ? '0 0 14px rgba(0,229,160,0.25)' : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '0.65rem', fontWeight: 600,
                letterSpacing: '0.02em',
                color: active ? 'var(--accent)' : done ? 'var(--text-dim)' : 'var(--text-muted)',
                transition: 'color 0.3s',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 36, height: 1.5,
                background: i < current
                  ? 'linear-gradient(90deg, var(--accent-dim), var(--accent-dark))'
                  : 'var(--border)',
                marginBottom: 20,
                transition: 'background 0.4s',
                flexShrink: 0,
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
