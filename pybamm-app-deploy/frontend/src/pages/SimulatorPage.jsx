import { useState, useEffect } from 'react'
import { Play, ChevronRight, ChevronLeft, AlertTriangle, Battery, Info, RotateCcw } from 'lucide-react'
import Toggle from '../components/Toggle'
import SliderInput from '../components/SliderInput'
import ResultsDashboard from '../components/ResultsDashboard'
import { runSimulation, checkHealth } from '../api/client'

/* ─── Data ──────────────────────────────────────────────────────────────── */

const MODELS = [
  { id: 'SPM',  name: 'SPM',  desc: 'Single Particle Model', detail: 'Fastest. One particle per electrode. Best for C ≤ 2, education & quick sweeps.', speed: '~2–5s',   color: '#00e5a0' },
  { id: 'SPMe', name: 'SPMe', desc: 'SPM with Electrolyte',  detail: 'SPM + electrolyte transport. Better accuracy, still fast. Recommended for most users.', speed: '~5–15s',  color: '#4f8ef7' },
  { id: 'DFN',  name: 'DFN',  desc: 'Doyle–Fuller–Newman',   detail: 'Full porous-electrode model. Research-grade accuracy across all C-rates.', speed: '~15–40s', color: '#a855f7' },
  { id: 'NewmanTobias', name: 'N–T', desc: 'Newman–Tobias',  detail: 'Simplified DFN without particle effects. Intermediate fidelity.', speed: '~10–25s', color: '#f59e0b' },
]

const PARAM_SETS = [
  { id: 'Chen2020',    label: 'Chen2020',    detail: 'LG M50 21700 · NMC/Graphite · 5 A·h',           cap: '5.0',  chem: 'NMC/Gr' },
  { id: 'Marquis2019',label: 'Marquis2019', detail: 'Kokam · NMC/Graphite · 0.68 A·h',               cap: '0.68', chem: 'NMC/Gr' },
  { id: 'Ecker2015',   label: 'Ecker2015',   detail: 'Kokam · NMC/Graphite · 0.156 A·h',              cap: '0.16', chem: 'NMC/Gr' },
  { id: 'OKane2022',   label: 'OKane2022',   detail: 'LG M50 · NMC/Graphite-SiOx · 5 A·h (plating)', cap: '5.0',  chem: 'NMC/SiOx' },
  { id: 'ORegan2022',  label: 'ORegan2022',  detail: 'LG M50 · NMC811/Graphite-SiOx · 5 A·h',        cap: '5.0',  chem: 'NMC811' },
  { id: 'Ramadass2004',label: 'Ramadass2004',detail: 'Sony US18650 · LCO/Graphite · 1 A·h',           cap: '1.0',  chem: 'LCO/Gr' },
  { id: 'NCA_Kim2011', label: 'NCA_Kim2011', detail: 'NCA/Graphite · 0.43 A·h',                       cap: '0.43', chem: 'NCA/Gr' },
  { id: 'Ai2020',      label: 'Ai2020',      detail: 'NMC/Graphite · Particle mechanics params',      cap: '2.28', chem: 'NMC/Gr' },
]

const EXPERIMENTS = [
  { id: 'discharge',        label: 'Discharge',           icon: '⬇', tag: 'CC',       desc: 'Constant-current discharge to cutoff voltage.' },
  { id: 'charge',           label: 'CC-CV Charge',        icon: '⬆', tag: 'CC-CV',    desc: 'CC charge to upper voltage, then CV hold until C/20.' },
  { id: 'charge_discharge', label: 'Full Cycle(s)',        icon: '↻', tag: 'Cycle',    desc: 'Discharge → rest → CC-CV charge. Supports multi-cycle.' },
  { id: 'cccv',             label: 'CCCV Only',            icon: '⚡', tag: 'CC-CV',   desc: 'Pure CC-CV charge from low SOC.' },
  { id: 'hppc',             label: 'HPPC Pulse',           icon: '📊', tag: 'Pulse',   desc: 'Hybrid Pulse Power Characterization — pulse/rest sequence.' },
  { id: 'rate_capability',  label: 'Rate Capability',      icon: '📈', tag: 'Multi-C', desc: 'Discharge at multiple C-rates (0.1C→3C) with recharge between.' },
  { id: 'drive_cycle',      label: 'Drive Cycle',          icon: '🚗', tag: 'Dynamic', desc: 'Simplified dynamic load profile simulating vehicle use.' },
  { id: 'constant_current', label: 'Timed Discharge',      icon: '⏱', tag: 'Timed',   desc: 'CC discharge for a fixed duration. Good for C-rate studies.' },
  { id: 'custom',           label: 'Custom Experiment',    icon: '🔧', tag: 'Custom',  desc: 'Write your own PyBaMM experiment steps (one per line).' },
]

const THERMAL_OPTS = [
  { id: 'isothermal', label: 'Isothermal',  desc: 'No heat — constant temperature throughout.' },
  { id: 'lumped',     label: 'Lumped',      desc: 'Single average cell temperature (recommended).' },
  { id: 'x-lumped',  label: 'X-Lumped',    desc: 'Temperature averaged across thickness. Auto-uses lumped for cylindrical cells.' },
  { id: 'x-full',    label: 'X-Full',      desc: 'Full 1D thermal profile. Auto-uses lumped for cylindrical cells.' },
]

const SEI_OPTS = [
  { id: 'none',                          label: 'None',                       desc: 'No SEI degradation.' },
  { id: 'ec reaction limited',           label: 'EC Reaction Limited',        desc: 'Standard SEI growth model (recommended).' },
  { id: 'ec reaction limited (asymmetric)', label: 'EC Asymmetric',          desc: 'Asymmetric EC reaction-limited SEI.' },
  { id: 'solvent-diffusion limited',     label: 'Solvent Diffusion',          desc: 'SEI limited by solvent diffusion through film.' },
  { id: 'electron-migration limited',    label: 'Electron Migration',         desc: 'SEI limited by electron migration.' },
  { id: 'interstitial-diffusion limited',label: 'Interstitial Diffusion',     desc: 'SEI growth via interstitial diffusion.' },
  { id: 'constant',                      label: 'Constant SEI',               desc: 'SEI with constant film thickness (no growth).' },
]

const PLATING_OPTS = [
  { id: 'none',                  label: 'None',                 desc: 'No lithium plating.' },
  { id: 'reversible',            label: 'Reversible',           desc: 'Plated lithium can re-intercalate.' },
  { id: 'irreversible',          label: 'Irreversible',         desc: 'Plated lithium is permanently lost (dead lithium).' },
  { id: 'partially reversible',  label: 'Partially Reversible', desc: 'Mix of reversible and irreversible plating.' },
]

const MECHANICS_OPTS = [
  { id: 'none',                  label: 'None',                desc: 'No mechanical effects.' },
  { id: 'swelling only',         label: 'Swelling',            desc: 'Track electrode swelling during cycling.' },
  { id: 'swelling and cracking', label: 'Swelling + Cracking', desc: 'Full mechanics: swelling, cracking, SEI on cracks.' },
]

const PARTICLE_OPTS = [
  { id: 'Fickian diffusion',  label: 'Fickian Diffusion', desc: 'Standard solid diffusion (recommended).' },
  { id: 'uniform profile',    label: 'Uniform Profile',   desc: 'Uniform concentration in particle (fast).' },
  { id: 'quadratic profile',  label: 'Quadratic Profile', desc: 'Quadratic approximation of concentration.' },
  { id: 'quartic profile',    label: 'Quartic Profile',   desc: 'Higher-order approximation of concentration.' },
]

const LOADING_MSGS = [
  'Building electrochemical model…',
  'Applying parameter values…',
  'Setting up submodels…',
  'Initialising DAE solver…',
  'Integrating differential equations…',
  'Extracting solution variables…',
  'Almost done…',
]

/* ─── Helper UI bits ─────────────────────────────────────────────────────── */

function Tag({ label, color = '#00e5a0' }) {
  return (
    <span style={{
      fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', fontWeight: 700,
      background: color + '18', color, border: `1px solid ${color}33`,
      borderRadius: 4, padding: '1px 6px', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function SelectRow({ id, selected, onClick, children, accent = '#00e5a0' }) {
  return (
    <div onClick={() => onClick(id)} style={{
      padding: '0.85rem 1rem', cursor: 'pointer', borderRadius: 9,
      display: 'flex', alignItems: 'center', gap: 12,
      background: selected ? accent + '08' : 'var(--surface2)',
      border: `1px solid ${selected ? accent : 'var(--border)'}`,
      transition: 'all 0.15s',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: selected ? accent : 'var(--border-bright)',
        boxShadow: selected ? `0 0 8px ${accent}80` : 'none',
        transition: 'all 0.2s',
      }} />
      {children}
    </div>
  )
}

function SectionHead({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px' }}>{title}</h2>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  )
}

function InfoBox({ children, color = 'rgba(79,142,247,0.07)', border = 'rgba(79,142,247,0.2)', text = '#a8bef7' }) {
  return (
    <div style={{
      display: 'flex', gap: 9, alignItems: 'flex-start',
      background: color, border: `1px solid ${border}`,
      borderRadius: 9, padding: '9px 12px', marginTop: 10,
    }}>
      <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>ℹ</span>
      <span style={{ color: text, fontSize: '0.77rem', lineHeight: 1.55 }}>{children}</span>
    </div>
  )
}

function WarnBox({ children }) {
  return (
    <div style={{
      display: 'flex', gap: 9, alignItems: 'flex-start',
      background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)',
      borderRadius: 9, padding: '9px 12px', marginTop: 10,
    }}>
      <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>⚠</span>
      <span style={{ color: '#fcd47a', fontSize: '0.77rem', lineHeight: 1.55 }}>{children}</span>
    </div>
  )
}

/* ─── Steps ─────────────────────────────────────────────────────────────── */
const STEPS = ['Model', 'Cell', 'Experiment', 'Physics', 'Parameters', 'Run']

function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
      {STEPS.map((label, i) => {
        const done = i < current, active = i === current
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 52 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Space Mono, monospace', fontSize: done ? '0.75rem' : '0.68rem', fontWeight: 700,
                transition: 'all 0.3s',
                background: done ? 'var(--accent-dim)' : active ? 'rgba(0,229,160,0.12)' : 'var(--surface2)',
                color: done ? '#000' : active ? 'var(--accent)' : 'var(--text-muted)',
                border: active ? '1.5px solid var(--accent)' : done ? '1.5px solid var(--accent-dim)' : '1.5px solid var(--border)',
                boxShadow: active ? '0 0 14px rgba(0,229,160,0.25)' : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap',
                color: active ? 'var(--accent)' : done ? 'var(--text-dim)' : 'var(--text-muted)',
              }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 28, height: 1.5, marginBottom: 18, flexShrink: 0,
                background: i < current ? 'var(--accent-dim)' : 'var(--border)',
                transition: 'background 0.4s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function SimulatorPage() {
  const [step, setStep] = useState(0)
  // Config state
  const [modelType, setModelType]   = useState('SPM')
  const [paramSet, setParamSet]     = useState('Chen2020')
  const [expType, setExpType]       = useState('discharge')
  const [numCycles, setNumCycles]   = useState(1)
  const [customSteps, setCustomSteps] = useState('Discharge at 1C until 2.5V\nRest for 5 minutes\nCharge at 0.5C until 4.2V')
  const [thermal, setThermal]       = useState('isothermal')
  const [sei, setSei]               = useState('none')
  const [plating, setPlating]       = useState('none')
  const [mechanics, setMechanics]   = useState('none')
  const [particle, setParticle]     = useState('Fickian diffusion')
  const [cRate, setCRate]           = useState(1.0)
  const [temperature, setTemp]      = useState(25)
  const [cutoff, setCutoff]         = useState(2.5)
  const [upperV, setUpperV]         = useState(4.2)
  const [duration, setDuration]     = useState(60)
  // UI state
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [results, setResults]       = useState(null)
  const [loadMsgIdx, setLoadMsgIdx] = useState(0)
  const [backendOk, setBackendOk]   = useState(null)

  useEffect(() => {
    checkHealth().then(() => setBackendOk(true)).catch(() => setBackendOk(false))
  }, [])

  const next = () => { setError(null); setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  const back = () => { setError(null); setStep(s => Math.max(s - 1, 0)) }

  // Warn: plating needs specific params
  const platingWarn = plating !== 'none' && !['OKane2022', 'Chen2020'].includes(paramSet)
  const mechanicsWarn = mechanics !== 'none' && !['Ai2020', 'Chen2020'].includes(paramSet)

  async function handleRun() {
    if (platingWarn) return setError('Change parameter set to OKane2022 or Chen2020 to use lithium plating.')
    if (mechanicsWarn) return setError('Change parameter set to Ai2020 or Chen2020 to use particle mechanics.')
    setLoading(true); setError(null); setLoadMsgIdx(0)
    const iv = setInterval(() => setLoadMsgIdx(i => (i + 1) % LOADING_MSGS.length), 2200)
    try {
      const data = await runSimulation({
        model_type: modelType,
        param_set: paramSet,
        experiment_type: expType,
        num_cycles: numCycles,
        custom_steps: expType === 'custom' ? customSteps : null,
        thermal, sei,
        lithium_plating: plating,
        particle_mechanics: mechanics,
        particle,
        c_rate: cRate,
        temperature_celsius: temperature,
        cutoff_voltage: cutoff,
        upper_voltage: upperV,
        duration_minutes: duration,
      })
      setResults(data)
      setStep(STEPS.length) // results
    } catch (e) {
      setError(e.message)
      setBackendOk(false)
    } finally {
      clearInterval(iv); setLoading(false)
    }
  }

  function handleReset() {
    setResults(null); setStep(0); setError(null)
    checkHealth().then(() => setBackendOk(true)).catch(() => setBackendOk(false))
  }

  if (step === STEPS.length && results) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <ResultsDashboard data={results} onReset={handleReset} />
      </div>
    )
  }

  const isLastStep = step === STEPS.length - 1

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Header */}
      <header style={{
        width: '100%', borderBottom: '1px solid var(--border)',
        background: 'rgba(8,10,14,0.92)', backdropFilter: 'blur(14px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '11px 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
          }}>🔋</div>
          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
            PyBaMM <span style={{ color: 'var(--accent)' }}>Simulator</span>
          </span>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '0.6rem',
            color: 'var(--text-muted)', background: 'var(--surface2)',
            border: '1px solid var(--border)', borderRadius: 5, padding: '2px 8px',
          }}>
            Full PyBaMM · v26.3
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: backendOk === null ? '#f59e0b' : backendOk ? '#00e5a0' : '#ef4444',
              boxShadow: backendOk ? '0 0 8px rgba(0,229,160,0.5)' : 'none',
            }} />
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
              {backendOk === null ? 'connecting…' : backendOk ? 'backend online' : 'backend offline'}
            </span>
          </div>
        </div>
      </header>

      {backendOk === false && (
        <div style={{ width: '100%', background: 'rgba(239,68,68,0.09)', borderBottom: '1px solid rgba(239,68,68,0.25)', padding: '9px 1.5rem', textAlign: 'center' }}>
          <span style={{ color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600 }}>
            ⚠ Backend offline — run: <code style={{ fontFamily: 'Space Mono, monospace', color: '#f87171' }}>cd backend &amp;&amp; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload</code>
          </span>
        </div>
      )}

      <main style={{ width: '100%', maxWidth: 720, padding: '2rem 1.5rem', flex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
            Electrochemical <span style={{ color: 'var(--accent)', textShadow: '0 0 30px rgba(0,229,160,0.3)' }}>Cell Simulation</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Full PyBaMM capabilities · 5 models · 8 parameter sets · multi-physics · multi-cycle · custom experiments
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem', overflowX: 'auto', paddingBottom: 4 }}>
          <StepBar current={step} />
        </div>

        {/* Step card */}
        <div className="fade-up" key={`step-${step}`} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.6rem', marginBottom: '1rem',
        }}>

          {/* ── Step 0: Model ── */}
          {step === 0 && (
            <>
              <SectionHead title="Electrochemical Model" subtitle="Choose model complexity. SPMe is the best balance of speed and accuracy." />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {MODELS.map(m => (
                  <div key={m.id}
                    className={`model-card card-inner${modelType === m.id ? ' selected' : ''}`}
                    onClick={() => setModelType(m.id)}
                    style={{ padding: '1rem', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 7, fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: modelType === m.id ? m.color + '1a' : 'var(--surface3)',
                        border: `1px solid ${modelType === m.id ? m.color + '40' : 'var(--border)'}`,
                      }}>⚗</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: modelType === m.id ? m.color : 'var(--text)' }}>{m.name}</div>
                        <Tag label={m.speed} color={modelType === m.id ? m.color : 'var(--text-muted)'} />
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4 }}>{m.desc}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{m.detail}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Step 1: Cell Parameters ── */}
          {step === 1 && (
            <>
              <SectionHead title="Cell & Parameter Set" subtitle="Choose the published parameter set for your cell chemistry." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {PARAM_SETS.map(p => (
                  <SelectRow key={p.id} id={p.id} selected={paramSet === p.id} onClick={setParamSet}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: paramSet === p.id ? 'var(--accent)' : 'var(--text)' }}>{p.label}</span>
                        <Tag label={p.chem} color={paramSet === p.id ? 'var(--accent)' : 'var(--text-muted)'} />
                        <Tag label={`${p.cap} A·h`} color={paramSet === p.id ? '#4f8ef7' : 'var(--text-muted)'} />
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{p.detail}</div>
                    </div>
                  </SelectRow>
                ))}
              </div>
            </>
          )}

          {/* ── Step 2: Experiment ── */}
          {step === 2 && (
            <>
              <SectionHead title="Experiment Protocol" subtitle="Select the simulation protocol to run on the cell." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {EXPERIMENTS.map(exp => (
                  <SelectRow key={exp.id} id={exp.id} selected={expType === exp.id} onClick={setExpType}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: '1rem' }}>{exp.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: expType === exp.id ? 'var(--accent)' : 'var(--text)' }}>{exp.label}</span>
                        <Tag label={exp.tag} color={expType === exp.id ? 'var(--accent)' : 'var(--text-muted)'} />
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{exp.desc}</div>
                    </div>
                  </SelectRow>
                ))}
              </div>
              {expType === 'charge_discharge' && (
                <div style={{ marginTop: 14 }}>
                  <SliderInput label="Number of Cycles" value={numCycles} min={1} max={10} step={1} unit=" cycles"
                    description="Repeat the full charge-discharge cycle" onChange={setNumCycles} />
                </div>
              )}
              {expType === 'custom' && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>Custom PyBaMM Steps</div>
                  <textarea
                    value={customSteps}
                    onChange={e => setCustomSteps(e.target.value)}
                    rows={6}
                    style={{
                      width: '100%', background: 'var(--surface2)', border: '1px solid var(--border-bright)',
                      borderRadius: 8, padding: '10px 12px', color: 'var(--text)',
                      fontFamily: 'Space Mono, monospace', fontSize: '0.75rem', lineHeight: 1.6,
                      resize: 'vertical', outline: 'none',
                    }}
                    placeholder="Discharge at 1C until 2.5V&#10;Rest for 5 minutes&#10;Charge at 0.5C until 4.2V&#10;Hold at 4.2V until C/20"
                  />
                  <InfoBox>One PyBaMM experiment step per line. Uses standard PyBaMM syntax.</InfoBox>
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Physics ── */}
          {step === 3 && (
            <>
              <SectionHead title="Physics Submodels" subtitle="Enable additional physics. Each adds computation time." />

              <SubSection label="Thermal Model">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {THERMAL_OPTS.map(o => (
                    <SelectRow key={o.id} id={o.id} selected={thermal === o.id} onClick={setThermal}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: thermal === o.id ? 'var(--accent)' : 'var(--text)' }}>{o.label}</div>
                        <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>{o.desc}</div>
                      </div>
                    </SelectRow>
                  ))}
                </div>
              </SubSection>

              <SubSection label="SEI Degradation">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SEI_OPTS.map(o => (
                    <SelectRow key={o.id} id={o.id} selected={sei === o.id} onClick={setSei}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: sei === o.id ? 'var(--accent)' : 'var(--text)' }}>{o.label}</div>
                        <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>{o.desc}</div>
                      </div>
                    </SelectRow>
                  ))}
                </div>
                {sei !== 'none' && <WarnBox>SEI adds 30–60 s. Works with all parameter sets.</WarnBox>}
              </SubSection>

              <SubSection label="Lithium Plating">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {PLATING_OPTS.map(o => (
                    <SelectRow key={o.id} id={o.id} selected={plating === o.id} onClick={setPlating}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: plating === o.id ? 'var(--accent)' : 'var(--text)' }}>{o.label}</div>
                        <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>{o.desc}</div>
                      </div>
                    </SelectRow>
                  ))}
                </div>
                {plating !== 'none' && <WarnBox>Lithium plating requires <strong>OKane2022</strong> or <strong>Chen2020</strong> parameter sets.</WarnBox>}
              </SubSection>

              <SubSection label="Particle Mechanics">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {MECHANICS_OPTS.map(o => (
                    <SelectRow key={o.id} id={o.id} selected={mechanics === o.id} onClick={setMechanics}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: mechanics === o.id ? 'var(--accent)' : 'var(--text)' }}>{o.label}</div>
                        <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>{o.desc}</div>
                      </div>
                    </SelectRow>
                  ))}
                </div>
                {mechanics !== 'none' && <WarnBox>Mechanics requires <strong>Ai2020</strong> or <strong>Chen2020</strong> parameter sets.</WarnBox>}
              </SubSection>

              <SubSection label="Particle Diffusion">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {PARTICLE_OPTS.map(o => (
                    <SelectRow key={o.id} id={o.id} selected={particle === o.id} onClick={setParticle}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: particle === o.id ? 'var(--accent)' : 'var(--text)' }}>{o.label}</div>
                        <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)' }}>{o.desc}</div>
                      </div>
                    </SelectRow>
                  ))}
                </div>
              </SubSection>
            </>
          )}

          {/* ── Step 4: Parameters ── */}
          {step === 4 && (
            <>
              <SectionHead title="Operating Conditions" subtitle="Fine-tune C-rate, temperature, and voltage limits." />
              <SliderInput label="C-rate" value={cRate} min={0.05} max={5} step={0.05} unit="C"
                description="e.g. 1C = full discharge in 1 h, 2C = 30 min" onChange={setCRate} />
              <SliderInput label="Temperature" value={temperature} min={-20} max={60} step={1} unit="°C"
                description="Ambient & initial cell temperature" onChange={setTemp} />
              <SliderInput label="Cutoff Voltage" value={cutoff} min={2.0} max={3.5} step={0.05} unit=" V"
                description="Discharge termination voltage" onChange={setCutoff} />
              <SliderInput label="Upper Voltage" value={upperV} min={3.8} max={4.4} step={0.05} unit=" V"
                description="Charge termination voltage" onChange={setUpperV} />
              {(expType === 'constant_current' || expType === 'rest') && (
                <SliderInput label="Duration" value={duration} min={5} max={120} step={5} unit=" min"
                  description="Fixed simulation time" onChange={setDuration} />
              )}
            </>
          )}

          {/* ── Step 5: Review & Run ── */}
          {step === 5 && (
            <>
              <SectionHead title="Review & Run" subtitle="Confirm your configuration and launch the simulation." />
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16,
              }}>
                {[
                  ['Model',       modelType],
                  ['Parameters',  paramSet],
                  ['Experiment',  EXPERIMENTS.find(e => e.id === expType)?.label],
                  ['Cycles',      numCycles],
                  ['C-rate',      `${cRate} C`],
                  ['Temperature', `${temperature} °C`],
                  ['Cutoff V',    `${cutoff} V`],
                  ['Upper V',     `${upperV} V`],
                  ['Thermal',     thermal],
                  ['SEI',         sei === 'none' ? 'Off' : sei],
                  ['Li Plating',  plating === 'none' ? 'Off' : plating],
                  ['Mechanics',   mechanics === 'none' ? 'Off' : mechanics],
                  ['Particle',    particle],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 12px',
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </div>
              {(platingWarn || mechanicsWarn) && (
                <WarnBox>
                  {platingWarn && `Lithium plating needs OKane2022 or Chen2020 parameters. `}
                  {mechanicsWarn && `Particle mechanics needs Ai2020 or Chen2020 parameters. `}
                  Go back to fix before running.
                </WarnBox>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: '1rem', display: 'flex', gap: 10, alignItems: 'flex-start',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <AlertTriangle size={15} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ color: '#fca5a5', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Error</div>
                <div style={{ color: '#fca5a5', fontSize: '0.74rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{error}</div>
              </div>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && !loading && (
            <button onClick={back} style={{
              display: 'flex', alignItems: 'center', gap: 6, minWidth: 80,
              background: 'var(--surface)', border: '1px solid var(--border-bright)',
              color: 'var(--text-dim)', borderRadius: 10, padding: '10px 16px',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.83rem', fontFamily: 'Syne, sans-serif',
            }}>
              <ChevronLeft size={13} /> Back
            </button>
          )}

          {!isLastStep ? (
            <button onClick={next} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--accent)', border: 'none', color: '#000',
              borderRadius: 10, padding: '11px 20px',
              cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', fontFamily: 'Syne, sans-serif',
            }}>
              Continue <ChevronRight size={13} />
            </button>
          ) : (
            <button onClick={handleRun} disabled={loading} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: loading ? 'var(--surface2)' : 'var(--accent)',
              border: loading ? '1px solid var(--border-bright)' : 'none',
              color: loading ? 'var(--text-muted)' : '#000',
              borderRadius: 10, padding: '12px 20px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 800, fontSize: '0.9rem', fontFamily: 'Syne, sans-serif',
              transition: 'all 0.2s',
            }}>
              {loading ? (
                <>
                  <div style={{ width: 15, height: 15, border: '2px solid rgba(100,100,100,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} className="spin" />
                  <span style={{ fontSize: '0.78rem' }}>{LOADING_MSGS[loadMsgIdx]}</span>
                </>
              ) : (
                <><Play size={14} fill="currentColor" /> Run Simulation</>
              )}
            </button>
          )}
        </div>
      </main>

      <footer style={{ width: '100%', textAlign: 'center', padding: '1rem', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'Space Mono, monospace', fontSize: '0.62rem' }}>
        PyBaMM Cell Simulator · 5 models · 8 parameter sets · multi-physics · custom experiments
      </footer>
    </div>
  )
}

function SubSection({ label, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontFamily: 'Space Mono, monospace' }}>{label}</div>
      {children}
    </div>
  )
}
