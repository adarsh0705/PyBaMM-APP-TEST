export default function SliderInput({ label, value, min, max, step, unit, onChange, description }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ marginBottom: '1.3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: '0.855rem', fontWeight: 700, color: 'var(--text)' }}>{label}</span>
          {description && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 8 }}>— {description}</span>}
        </div>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', minWidth: 70, textAlign: 'right' }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', padding: '4px 0' }}>
        <div style={{
          position: 'absolute', left: 0, top: '50%',
          width: `${Math.max(0, Math.min(100, pct))}%`, height: 3,
          background: 'linear-gradient(90deg, var(--accent-dark), var(--accent))',
          borderRadius: 2, transform: 'translateY(-50%)',
          pointerEvents: 'none', zIndex: 1,
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: 'relative', zIndex: 2 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.63rem', color: 'var(--text-muted)' }}>{min}{unit}</span>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.63rem', color: 'var(--text-muted)' }}>{max}{unit}</span>
      </div>
    </div>
  )
}
