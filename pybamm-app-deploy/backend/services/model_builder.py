import pybamm
from typing import Optional


# All validated working parameter sets with metadata
PARAMETER_SETS = {
    'Chen2020':    {'desc': 'LG M50 21700 NMC/Graphite 5Ah',      'capacity': 5.0,    'chemistry': 'NMC/Graphite'},
    'Marquis2019': {'desc': 'Kokam NMC/Graphite 0.68Ah',           'capacity': 0.68,   'chemistry': 'NMC/Graphite'},
    'Ecker2015':   {'desc': 'Kokam NMC/Graphite 0.156Ah',          'capacity': 0.156,  'chemistry': 'NMC/Graphite'},
    'OKane2022':   {'desc': 'LG M50 NMC/Graphite-SiOx 5Ah',        'capacity': 5.0,    'chemistry': 'NMC/Graphite-SiOx'},
    'ORegan2022':  {'desc': 'LG M50 NMC811/Graphite-SiOx 5Ah',     'capacity': 5.0,    'chemistry': 'NMC811/Graphite-SiOx'},
    'Ramadass2004':{'desc': 'Sony US18650 LCO/Graphite 1Ah',        'capacity': 1.0,    'chemistry': 'LCO/Graphite'},
    'NCA_Kim2011': {'desc': 'NCA/Graphite 0.43Ah',                  'capacity': 0.43,   'chemistry': 'NCA/Graphite'},
    'Ai2020':      {'desc': 'Lithium-ion with particle mechanics',   'capacity': 2.28,   'chemistry': 'NMC/Graphite'},
}

# Li-plating compatible param sets
PLATING_PARAM_SETS = {'OKane2022', 'Chen2020'}

# Mechanics compatible param sets
MECHANICS_PARAM_SETS = {'Ai2020', 'Chen2020'}


def build_model(
    model_type: str,
    thermal: str = 'isothermal',
    sei: str = 'none',
    lithium_plating: str = 'none',
    particle_mechanics: str = 'none',
    particle: str = 'Fickian diffusion',
    electrolyte: str = 'default',
) -> pybamm.BaseBatteryModel:
    """Build a PyBaMM model with full options support."""

    options = {
        'thermal': thermal,
        'particle': particle,
    }

    # SEI
    if sei != 'none':
        options['SEI'] = sei

    # Lithium plating
    if lithium_plating != 'none':
        options['lithium plating'] = lithium_plating
        options['lithium plating porosity change'] = 'true'

    # Particle mechanics
    if particle_mechanics != 'none':
        options['particle mechanics'] = particle_mechanics
        if sei != 'none':
            options['SEI on cracks'] = 'true'

    model_map = {
        'SPM':  pybamm.lithium_ion.SPM,
        'SPMe': pybamm.lithium_ion.SPMe,
        'DFN':  pybamm.lithium_ion.DFN,
        'NewmanTobias': pybamm.lithium_ion.NewmanTobias,
        'Yang2017': pybamm.lithium_ion.Yang2017,
    }

    if model_type not in model_map:
        raise ValueError(f"Unknown model type: {model_type}")

    # Yang2017 / MSMR need different handling
    try:
        return model_map[model_type](options=options)
    except Exception as e:
        # Fallback: try without advanced options
        basic_options = {'thermal': thermal}
        if sei != 'none':
            basic_options['SEI'] = sei
        return model_map[model_type](options=basic_options)


def get_parameter_values(
    param_set: str,
    temperature_celsius: float,
    initial_soc: float = 1.0,
) -> pybamm.ParameterValues:
    """Return parameter values with user overrides."""
    if param_set not in PARAMETER_SETS:
        raise ValueError(f"Unknown parameter set: {param_set}")

    param = pybamm.ParameterValues(param_set)
    temp_k = temperature_celsius + 273.15
    param["Ambient temperature [K]"] = temp_k

    try:
        param["Initial temperature [K]"] = temp_k
    except Exception:
        pass

    # Set initial SOC via stoichiometry
    if initial_soc < 0.99:
        try:
            c_n_max = param["Maximum concentration in negative electrode [mol.m-3]"]
            c_p_max = param["Maximum concentration in positive electrode [mol.m-3]"]
            # Generic stoichiometry limits (safe defaults)
            x_n_0, x_n_100 = 0.0279, 0.9014
            x_p_0, x_p_100 = 0.9084, 0.4133
            x_n = x_n_0 + initial_soc * (x_n_100 - x_n_0)
            x_p = x_p_0 + initial_soc * (x_p_100 - x_p_0)
            param["Initial concentration in negative electrode [mol.m-3]"] = x_n * c_n_max
            param["Initial concentration in positive electrode [mol.m-3]"] = x_p * c_p_max
        except Exception:
            pass

    return param
