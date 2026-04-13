from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
import traceback

from services.model_builder import build_model, get_parameter_values, PARAMETER_SETS
from services.experiment_builder import build_experiment
from services.simulation_runner import run_simulation, SimulationTimeoutError
from services.result_parser import parse_results

router = APIRouter()


class SimulationConfig(BaseModel):
    model_type: Literal["SPM", "SPMe", "DFN", "NewmanTobias", "Yang2017"] = "SPM"
    param_set: str = "Chen2020"

    experiment_type: Literal[
        "discharge", "charge", "charge_discharge", "hppc",
        "rate_capability", "drive_cycle", "cccv",
        "constant_current", "rest", "custom"
    ] = "discharge"
    num_cycles: int = Field(1, ge=1, le=10)
    custom_steps: Optional[str] = None

    thermal: Literal["isothermal", "lumped", "x-lumped", "x-full"] = "isothermal"
    sei: Literal[
        "none", "ec reaction limited", "ec reaction limited (asymmetric)",
        "solvent-diffusion limited", "electron-migration limited",
        "interstitial-diffusion limited", "constant"
    ] = "none"
    lithium_plating: Literal[
        "none", "reversible", "irreversible", "partially reversible"
    ] = "none"
    particle_mechanics: Literal[
        "none", "swelling only", "swelling and cracking"
    ] = "none"
    particle: Literal[
        "Fickian diffusion", "uniform profile", "quadratic profile", "quartic profile"
    ] = "Fickian diffusion"

    c_rate: float = Field(1.0, ge=0.05, le=5.0)
    temperature_celsius: float = Field(25.0, ge=-20.0, le=60.0)
    cutoff_voltage: float = Field(2.5, ge=2.0, le=3.5)
    upper_voltage: float = Field(4.2, ge=3.8, le=4.4)
    duration_minutes: Optional[int] = Field(60, ge=1, le=120)

    @field_validator("param_set")
    @classmethod
    def validate_param_set(cls, v):
        if v not in PARAMETER_SETS:
            raise ValueError(f"Unknown parameter set: {v}. Valid: {list(PARAMETER_SETS.keys())}")
        return v

    @field_validator("c_rate")
    @classmethod
    def validate_c_rate(cls, v):
        return round(v, 2)


@router.post("/simulate")
async def simulate(config: SimulationConfig):
    try:
        # Validation: x-lumped requires pouch geometry — silently downgrade to lumped
        thermal = config.thermal
        if thermal in ('x-lumped', 'x-full'):
            thermal = 'lumped'

        # Validate plating needs compatible params
        if config.lithium_plating != 'none' and config.param_set not in {'OKane2022', 'Chen2020'}:
            raise ValueError(
                f"Lithium plating requires OKane2022 or Chen2020 parameter sets "
                f"(selected: {config.param_set})"
            )

        # Validate mechanics needs compatible params
        if config.particle_mechanics != 'none' and config.param_set not in {'Ai2020', 'Chen2020'}:
            raise ValueError(
                f"Particle mechanics requires Ai2020 or Chen2020 parameter sets "
                f"(selected: {config.param_set})"
            )

        # Build experiment
        experiment, t_eval, initial_soc = build_experiment(
            experiment_type=config.experiment_type,
            c_rate=config.c_rate,
            cutoff_voltage=config.cutoff_voltage,
            upper_voltage=config.upper_voltage,
            num_cycles=config.num_cycles,
            custom_steps=config.custom_steps,
            duration_minutes=config.duration_minutes,
        )

        # Build model
        model = build_model(
            model_type=config.model_type,
            thermal=thermal,
            sei=config.sei,
            lithium_plating=config.lithium_plating,
            particle_mechanics=config.particle_mechanics,
            particle=config.particle,
        )

        # Build parameters
        param = get_parameter_values(
            param_set=config.param_set,
            temperature_celsius=config.temperature_celsius,
            initial_soc=initial_soc,
        )

        # Compute timeout
        timeout = 60
        if config.model_type in ('DFN', 'NewmanTobias', 'Yang2017'): timeout += 60
        if config.model_type == 'SPMe': timeout += 20
        if config.sei != 'none': timeout += 30
        if config.lithium_plating != 'none': timeout += 30
        if config.particle_mechanics != 'none': timeout += 30
        if config.num_cycles > 1: timeout += config.num_cycles * 20
        if config.experiment_type == 'rate_capability': timeout += 60
        timeout = min(timeout, 300)

        solution = run_simulation(model, param, experiment, t_eval, timeout_seconds=timeout)

        results = parse_results(
            solution=solution,
            param=param,
            thermal=thermal,
            sei=config.sei,
            lithium_plating=config.lithium_plating,
            particle_mechanics=config.particle_mechanics,
        )

        # Report the actual thermal used (may have been downgraded)
        cfg_out = config.model_dump()
        cfg_out['thermal'] = thermal

        return {"status": "success", "config": cfg_out, "results": results}

    except SimulationTimeoutError as e:
        raise HTTPException(status_code=408, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation error: {str(e)}\n\n{traceback.format_exc()}"
        )


@router.get("/parameter-sets")
async def get_parameter_sets():
    return {"parameter_sets": PARAMETER_SETS}
