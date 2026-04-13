# 🔋 PyBaMM Cell Simulator — v5 (Full PyBaMM)

A no-code web app covering the **full capabilities** of PyBaMM.
5 models · 8 parameter sets · 9 experiment types · multi-physics · multi-cycle · custom experiments.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+ with pip
- Node.js 18+ with npm

### 1. Extract
```bash
tar xzf pybamm-app-v5.tar.gz
cd pybamm-app
```

### 2. Backend (Terminal 1)
```bash
pip install -r requirements.txt
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 🎯 What's Covered (Full PyBaMM)

### Models
| Model | Description | Speed |
|-------|-------------|-------|
| SPM | Single Particle Model | ~2–5s |
| SPMe | SPM with Electrolyte | ~5–15s |
| DFN | Doyle–Fuller–Newman | ~15–40s |
| Newman–Tobias | Simplified DFN | ~10–25s |

### Parameter Sets (8 real cells)
| Set | Cell | Chemistry | Capacity |
|-----|------|-----------|---------|
| Chen2020 | LG M50 21700 | NMC/Graphite | 5 A·h |
| Marquis2019 | Kokam | NMC/Graphite | 0.68 A·h |
| Ecker2015 | Kokam | NMC/Graphite | 0.156 A·h |
| OKane2022 | LG M50 | NMC/Graphite-SiOx | 5 A·h |
| ORegan2022 | LG M50 | NMC811/SiOx | 5 A·h |
| Ramadass2004 | Sony US18650 | LCO/Graphite | 1 A·h |
| NCA_Kim2011 | — | NCA/Graphite | 0.43 A·h |
| Ai2020 | — | NMC/Graphite (mechanics) | 2.28 A·h |

### Experiment Protocols (9 types)
- Standard Discharge (CC)
- CC-CV Charge
- Full Cycle (multi-cycle up to 10x)
- CCCV only
- HPPC Pulse
- Rate Capability (0.1C → 3C sweep)
- Drive Cycle (dynamic pulse profile)
- Timed Discharge (fixed duration)
- **Custom** (write your own PyBaMM steps)

### Physics Submodels
| Category | Options |
|----------|---------|
| Thermal | Isothermal, Lumped, X-Lumped, X-Full |
| SEI | 7 growth models (EC, solvent, electron, interstitial…) |
| Lithium Plating | Reversible, Irreversible, Partially Reversible |
| Particle Mechanics | Swelling, Swelling+Cracking |
| Particle Diffusion | Fickian, Uniform, Quadratic, Quartic |

### Results / Charts (up to 10 tabs)
- Voltage vs Time
- SOC vs Time
- Current vs Time
- Power vs Time
- Cell Temperature (thermal)
- SEI capacity loss (SEI)
- Lithium plating loss (plating)
- Crack length (mechanics)
- Electrolyte concentration (SPMe/DFN)
- Electrode lithiation (neg/pos)

---

## 📡 API

### `GET /api/health`
```json
{"status": "ok", "pybamm_version": "26.3.0"}
```

### `POST /api/simulate`
```json
{
  "model_type": "SPMe",
  "param_set": "Chen2020",
  "experiment_type": "charge_discharge",
  "num_cycles": 3,
  "thermal": "lumped",
  "sei": "ec reaction limited",
  "lithium_plating": "none",
  "particle_mechanics": "none",
  "particle": "Fickian diffusion",
  "c_rate": 1.0,
  "temperature_celsius": 25,
  "cutoff_voltage": 2.5,
  "upper_voltage": 4.2
}
```

### Custom Experiment Example
```json
{
  "experiment_type": "custom",
  "custom_steps": "Discharge at C/10 for 10 hours or until 3.3V\nRest for 1 hour\nCharge at 1A until 4.1V\nHold at 4.1V until 50 mA"
}
```

---

## 🗂 Project Structure

```
pybamm-app/
├── requirements.txt
├── backend/
│   ├── main.py
│   ├── routes/simulate.py          # POST /simulate, GET /parameter-sets
│   └── services/
│       ├── model_builder.py        # 5 models × full options
│       ├── experiment_builder.py   # 9 experiment types + custom
│       ├── simulation_runner.py    # Thread-safe + timeout
│       └── result_parser.py       # 10 result variables
└── frontend/src/
    ├── pages/SimulatorPage.jsx     # 6-step wizard
    └── components/
        ├── ResultsDashboard.jsx    # 10-tab results + mini overview
        ├── SliderInput.jsx
        └── Toggle.jsx
```

---

## ⚡ Compatibility Notes

- **Lithium plating** → requires OKane2022 or Chen2020 params
- **Particle mechanics** → requires Ai2020 or Chen2020 params
- **X-Lumped / X-Full thermal** → auto-downgrades to Lumped for cylindrical cells
- **DFN + degradation** → may take 60–120s; use SPM or SPMe for faster runs
