import { useState, useEffect, useRef } from 'react'
import { Download, RefreshCw } from 'lucide-react'

function PlotlyChart({ traces, layout, height = 300 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || typeof window.Plotly === 'undefined') return
    window.Plotly.newPlot(ref.current, traces, layout, {
      displayModeBar: true,
      modeBarButtonsToRemove: ['toImage','sendDataToCloud','select2d','lasso2d'],
      displaylogo: false, responsive: true,
    })
    return () => { if (ref.current && window.Plotly) window.Plotly.purge(ref.current) }
  }, [traces, layout])
  return <div ref={ref} style={{ width: '100%', height }} />
}

const BASE = {
  paper_bgcolor: 'transparent', plot_bgcolor: '#0b0e14',
  font: { family: 'Space Mono, monospace', color: '#5a6478', size: 10 },
  margin: { l: 58, r: 16, t: 16, b: 48 },
  hovermode: 'x unified',
  hoverlabel: { bgcolor: '#161920', bordercolor: '#2e3545', font: { family: 'Space Mono, monospace', color: '#e2e6f0', size: 11 } },
  xaxis: { gridcolor: '#131720', linecolor: '#1e2330', zeroline: false, tickfont: { size: 10 } },
  yaxis: { gridcolor: '#131720', linecolor: '#1e2330', zeroline: false, tickfont: { size: 10 } },
}
function L(xt, yt, xY = {}) {
  return { ...BASE, xaxis: { ...BASE.xaxis, title: { text: xt, font: { size: 11 }, standoff: 10 } }, yaxis: { ...BASE.yaxis, title: { text: yt, font: { size: 11 }, standoff: 10 }, ...xY } }
}
function line(x, y, color, name, fill = true) {
  return { x, y, type: 'scatter', mode: 'lines', line: { color, width: 2.5, shape: 'spline', smoothing: 0.5 }, name, ...(fill ? { fill: 'tozeroy', fillcolor: color + '10' } : {}) }
}

function Card({ label, value, unit, color = '#00e5a0' }) {
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 14px' }}>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label}</div>
      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.05rem', fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>
    </div>
  )
}

function Tab({ id, label, active, onClick }) {
  return (
    <button onClick={() => onClick(id)} style={{
      padding: '10px 14px', background: active ? 'var(--surface)' : 'transparent',
      border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Syne, sans-serif',
      cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
    }}>{label}</button>
  )
}

export default function ResultsDashboard({ data, onReset }) {
  const [tab, setTab] = useState('voltage')
  const { results: r, config: cfg } = data
  const t = r.time.map(x => x / 60)
  const soc = r.soc.map(x => x * 100)

  const hasThermal = cfg.thermal !== 'isothermal' && Array.isArray(r.temperature) && r.temperature.length > 0
  const hasSEI     = cfg.sei !== 'none' && r.degradation
  const hasPlating = cfg.lithium_plating !== 'none' && r.lithium_plating
  const hasMech    = cfg.particle_mechanics !== 'none' && r.mechanics
  const hasElec    = Array.isArray(r.electrolyte_concentration) && r.electrolyte_concentration.length > 0
  const hasPower   = Array.isArray(r.power) && r.power.length > 0
  const hasElectrode = r.electrode && (r.electrode.neg_lithiation || r.electrode.pos_lithiation)

  const tabs = [
    { id: 'voltage',  label: '📈 Voltage',       show: true },
    { id: 'soc',      label: '🔋 SOC',            show: true },
    { id: 'current',  label: '⚡ Current',         show: Array.isArray(r.current) },
    { id: 'power',    label: '⚡ Power',           show: hasPower },
    { id: 'temp',     label: '🌡 Temperature',     show: hasThermal },
    { id: 'sei',      label: '🧫 SEI',             show: hasSEI },
    { id: 'plating',  label: '🪨 Li Plating',      show: hasPlating },
    { id: 'mech',     label: '🔩 Mechanics',       show: hasMech },
    { id: 'electro',  label: '🧪 Electrolyte',     show: hasElec },
    { id: 'electrode',label: '⚗ Electrode',        show: hasElectrode },
  ].filter(x => x.show)

  const validTab = tabs.find(x => x.id === tab) ? tab : tabs[0]?.id || 'voltage'
  const s = r.summary

  function downloadCSV() {
    const cols = ['Time_s','Time_min','Voltage_V','SOC_pct']
    if (r.current)       cols.push('Current_A')
    if (hasThermal)      cols.push('Temperature_C')
    if (hasSEI)          cols.push('SEI_Loss_Neg_Ah')
    if (hasPlating && r.lithium_plating.li_loss_mol)       cols.push('LiPlating_Loss_mol')
    const rows = [cols.join(',')]
    r.time.forEach((tt, i) => {
      const row = [tt.toFixed(3),(tt/60).toFixed(4),r.voltage[i].toFixed(6),(r.soc[i]*100).toFixed(4)]
      if (r.current)  row.push(r.current[i].toFixed(5))
      if (hasThermal) row.push(r.temperature[i].toFixed(4))
      if (hasSEI && r.degradation.sei_loss_neg_ah) row.push(r.degradation.sei_loss_neg_ah[i].toFixed(8))
      if (hasPlating && r.lithium_plating.li_loss_mol) row.push(r.lithium_plating.li_loss_mol[i].toFixed(8))
      rows.push(row.join(','))
    })
    const b = new Blob([rows.join('\n')],{type:'text/csv'})
    const u = URL.createObjectURL(b)
    const a = document.createElement('a'); a.href=u; a.download=`pybamm_${cfg.model_type}_${cfg.experiment_type}.csv`; a.click(); URL.revokeObjectURL(u)
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px rgba(0,229,160,0.7)' }} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Simulation Results</h2>
          </div>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>
            {cfg.model_type} · {cfg.param_set} · {cfg.experiment_type} · {r.time.length} pts
            {cfg.num_cycles > 1 ? ` · ${cfg.num_cycles} cycles` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={downloadCSV} style={{ display:'flex',alignItems:'center',gap:6,background:'var(--surface2)',border:'1px solid var(--border-bright)',color:'var(--text)',borderRadius:9,padding:'7px 13px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,fontFamily:'Syne, sans-serif' }}>
            ⬇ CSV
          </button>
          <button onClick={onReset} style={{ display:'flex',alignItems:'center',gap:6,background:'var(--accent)',border:'none',color:'#000',borderRadius:9,padding:'7px 14px',cursor:'pointer',fontSize:'0.78rem',fontWeight:800,fontFamily:'Syne, sans-serif' }}>
            ↺ New
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 7 }}>
        <Card label="Duration"    value={(s.duration_s/60).toFixed(1)} unit="min" />
        <Card label="Min Voltage" value={s.min_voltage.toFixed(3)} unit="V" color="var(--accent2)" />
        <Card label="Max Voltage" value={s.max_voltage.toFixed(3)} unit="V" color="var(--accent)" />
        <Card label="Final SOC"   value={(s.final_soc*100).toFixed(1)} unit="%" />
        <Card label="Data Points" value={s.n_points} unit="pts" color="var(--text-dim)" />
        {s.max_temperature_c !== undefined && <Card label="Max Temp" value={s.max_temperature_c.toFixed(1)} unit="°C" color="#f97316" />}
        {s.temp_rise_c !== undefined && <Card label="Temp Rise" value={s.temp_rise_c.toFixed(2)} unit="°C" color="#fb923c" />}
        {s.sei_capacity_loss_ah !== undefined && <Card label="SEI Loss" value={s.sei_capacity_loss_ah.toFixed(5)} unit="A·h" color="#a855f7" />}
        {r.energy && Array.isArray(r.energy) && <Card label="Energy" value={r.energy[r.energy.length-1].toFixed(3)} unit="W·h" color="#4f8ef7" />}
      </div>

      {/* Tabbed chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ display: 'flex', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {tabs.map(tb => <Tab key={tb.id} {...tb} active={validTab === tb.id} onClick={setTab} />)}
        </div>
        <div style={{ padding: '1rem 0.75rem 0.5rem' }}>
          {validTab === 'voltage' && <PlotlyChart traces={[line(t, r.voltage, '#00e5a0', 'Voltage [V]')]} layout={L('Time [min]','Voltage [V]')} />}
          {validTab === 'soc'     && <PlotlyChart traces={[line(t, soc, '#4f8ef7', 'SOC [%]')]}          layout={L('Time [min]','SOC [%]', {range:[0,105]})} />}
          {validTab === 'current' && r.current && <PlotlyChart traces={[line(t, r.current, '#f59e0b', 'Current [A]', false)]} layout={L('Time [min]','Current [A]')} />}
          {validTab === 'power'   && hasPower && <PlotlyChart traces={[line(t, r.power, '#06b6d4', 'Power [W]', false)]} layout={L('Time [min]','Power [W]')} />}
          {validTab === 'temp'    && hasThermal && <PlotlyChart traces={[line(t, r.temperature, '#f97316', 'Cell Temperature [°C]')]} layout={L('Time [min]','Temperature [°C]')} />}
          {validTab === 'sei'     && hasSEI && (
            <PlotlyChart
              traces={[
                r.degradation.sei_loss_neg_ah && line(t, r.degradation.sei_loss_neg_ah, '#a855f7', 'SEI Loss Neg [A·h]'),
                r.degradation.sei_loss_pos_ah && line(t, r.degradation.sei_loss_pos_ah, '#7c3aed', 'SEI Loss Pos [A·h]', false),
              ].filter(Boolean)}
              layout={L('Time [min]','Capacity Loss [A·h]')}
            />
          )}
          {validTab === 'plating' && hasPlating && r.lithium_plating.li_loss_mol && (
            <PlotlyChart traces={[line(t, r.lithium_plating.li_loss_mol, '#ef4444', 'Li Plating Loss [mol]')]} layout={L('Time [min]','Li Loss [mol]')} />
          )}
          {validTab === 'mech' && hasMech && (
            <PlotlyChart
              traces={[
                r.mechanics.crack_length_neg_m && line(t, r.mechanics.crack_length_neg_m, '#84cc16', 'Crack Length Neg [m]'),
                r.mechanics.crack_length_pos_m && line(t, r.mechanics.crack_length_pos_m, '#65a30d', 'Crack Length Pos [m]', false),
              ].filter(Boolean)}
              layout={L('Time [min]','Crack Length [m]')}
            />
          )}
          {validTab === 'electro' && hasElec && (
            <PlotlyChart traces={[line(t, r.electrolyte_concentration, '#06b6d4', 'Electrolyte Conc [mol/m³]')]} layout={L('Time [min]','Concentration [mol/m³]')} />
          )}
          {validTab === 'electrode' && hasElectrode && (
            <PlotlyChart
              traces={[
                r.electrode.neg_lithiation && line(t, r.electrode.neg_lithiation, '#00e5a0', 'Neg Lithiation'),
                r.electrode.pos_lithiation && line(t, r.electrode.pos_lithiation, '#4f8ef7', 'Pos Lithiation', false),
              ].filter(Boolean)}
              layout={L('Time [min]','Extent of Lithiation')}
            />
          )}
        </div>
      </div>

      {/* Mini overview: always show V + SOC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Mini title="Voltage [V]"  t={t} y={r.voltage} color="#00e5a0" />
        <Mini title="SOC [%]"      t={t} y={soc}       color="#4f8ef7" yr={[0,105]} />
        {hasThermal && <Mini title="Temperature [°C]" t={t} y={r.temperature} color="#f97316" />}
        {hasSEI && r.degradation?.sei_loss_neg_ah && <Mini title="SEI Loss [A·h]" t={t} y={r.degradation.sei_loss_neg_ah} color="#a855f7" />}
        {hasPlating && r.lithium_plating?.li_loss_mol && <Mini title="Li Plating [mol]" t={t} y={r.lithium_plating.li_loss_mol} color="#ef4444" />}
      </div>

    </div>
  )
}

function Mini({ title, t, y, color, yr }) {
  const layout = {
    ...BASE,
    margin: { l: 38, r: 8, t: 30, b: 32 },
    title: { text: title, font: { size: 9, color: '#5a6478', family: 'Space Mono, monospace' }, x: 0.04 },
    xaxis: { ...BASE.xaxis, title: { text: 'min', font: { size: 9 } } },
    yaxis: { ...BASE.yaxis, ...(yr ? { range: yr } : {}) },
  }
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 11, padding: '0.35rem 0.2rem 0.2rem' }}>
      <PlotlyChart traces={[{ x: t, y, type: 'scatter', mode: 'lines', line: { color, width: 2 }, showlegend: false }]} layout={layout} height={175} />
    </div>
  )
}
