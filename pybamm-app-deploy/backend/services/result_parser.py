import pybamm
import numpy as np


def safe_extract(solution, var_name):
    """Safely extract a variable, returning None if not available."""
    try:
        data = solution[var_name].entries
        if data is not None and len(data) > 0:
            return data.tolist()
    except Exception:
        pass
    return None


def parse_results(
    solution: pybamm.Solution,
    param: pybamm.ParameterValues,
    thermal: str = 'isothermal',
    sei: str = 'none',
    lithium_plating: str = 'none',
    particle_mechanics: str = 'none',
) -> dict:
    """Extract all simulation results into a JSON-serializable dict."""

    time = solution["Time [s]"].entries.tolist()
    voltage = solution["Voltage [V]"].entries.tolist()
    current = safe_extract(solution, "Current [A]")

    # SOC from discharge capacity
    nominal_capacity = float(param.get("Nominal cell capacity [A.h]", 5.0))
    try:
        discharge_capacity = solution["Discharge capacity [A.h]"].entries
        soc = np.clip(1.0 - discharge_capacity / nominal_capacity, 0.0, 1.0).tolist()
    except Exception:
        soc = [1.0] * len(time)

    # Power and energy
    power, energy = None, None
    try:
        if current:
            power = [v * i for v, i in zip(voltage, current)]
        energy = safe_extract(solution, "Discharge energy [W.h]")
    except Exception:
        pass

    result = {
        "time": time,
        "voltage": voltage,
        "soc": soc,
        "current": current,
        "power": power,
        "energy": energy,
        "nominal_capacity_ah": nominal_capacity,
        "summary": {
            "duration_s": time[-1] - time[0] if time else 0,
            "min_voltage": min(voltage),
            "max_voltage": max(voltage),
            "final_soc": soc[-1] if soc else None,
            "n_points": len(time),
        },
    }

    # ── Thermal ──────────────────────────────────────────────────────────
    if thermal != 'isothermal':
        temp = safe_extract(solution, "X-averaged cell temperature [C]") or \
               safe_extract(solution, "Volume-averaged cell temperature [C]") or \
               safe_extract(solution, "Cell temperature [C]")
        result["temperature"] = temp
        if temp:
            result["summary"]["max_temperature_c"] = max(temp)
            result["summary"]["min_temperature_c"] = min(temp)
            result["summary"]["temp_rise_c"] = max(temp) - min(temp)
        # Heat generation
        result["heat_generation"] = safe_extract(solution, "X-averaged total heating [W.m-3]") or \
                                     safe_extract(solution, "Volume-averaged total heating [W.m-3]")

    # ── SEI Degradation ──────────────────────────────────────────────────
    if sei != 'none':
        sei_loss_neg = safe_extract(solution, "Loss of capacity to negative SEI [A.h]")
        sei_loss_pos = safe_extract(solution, "Loss of capacity to positive SEI [A.h]")
        sei_thickness = safe_extract(solution, "X-averaged negative SEI thickness [m]") or \
                       safe_extract(solution, "X-averaged total SEI thickness [m]")
        result["degradation"] = {
            "sei_loss_neg_ah": sei_loss_neg,
            "sei_loss_pos_ah": sei_loss_pos,
            "sei_thickness_m": sei_thickness,
            "total_loss_ah": sei_loss_neg[-1] if sei_loss_neg else None,
        }
        if sei_loss_neg:
            result["summary"]["sei_capacity_loss_ah"] = sei_loss_neg[-1]

    # ── Lithium Plating ──────────────────────────────────────────────────
    if lithium_plating != 'none':
        li_loss = safe_extract(solution, "Loss of lithium to lithium plating [mol]")
        li_thickness = safe_extract(solution, "X-averaged lithium plating thickness [m]")
        plating_current = safe_extract(solution, "X-averaged lithium plating interfacial current density [A.m-2]")
        result["lithium_plating"] = {
            "li_loss_mol": li_loss,
            "plating_thickness_m": li_thickness,
            "plating_current": plating_current,
        }
        if li_loss:
            result["summary"]["li_plating_loss_mol"] = li_loss[-1]

    # ── Particle Mechanics ───────────────────────────────────────────────
    if particle_mechanics != 'none':
        crack_neg = safe_extract(solution, "X-averaged negative particle crack length [m]")
        crack_pos = safe_extract(solution, "X-averaged positive particle crack length [m]")
        result["mechanics"] = {
            "crack_length_neg_m": crack_neg,
            "crack_length_pos_m": crack_pos,
        }

    # ── Electrode SOC ────────────────────────────────────────────────────
    neg_soc = safe_extract(solution, "X-averaged negative electrode extent of lithiation")
    pos_soc = safe_extract(solution, "X-averaged positive electrode extent of lithiation")
    if neg_soc or pos_soc:
        result["electrode"] = {"neg_lithiation": neg_soc, "pos_lithiation": pos_soc}

    # ── Electrolyte concentration (SPMe / DFN) ───────────────────────────
    c_e = safe_extract(solution, "X-averaged electrolyte concentration [mol.m-3]") or \
          safe_extract(solution, "Volume-averaged electrolyte concentration [mol.m-3]")
    if c_e:
        result["electrolyte_concentration"] = c_e

    return result
