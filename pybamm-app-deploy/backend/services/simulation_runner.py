import pybamm
import threading
from typing import Optional


class SimulationTimeoutError(Exception):
    pass


def run_simulation(
    model: pybamm.BaseBatteryModel,
    param: pybamm.ParameterValues,
    experiment: Optional[pybamm.Experiment],
    t_eval: Optional[list],
    timeout_seconds: int = 120,
) -> pybamm.Solution:
    result_container = {"solution": None, "error": None}

    def _run():
        try:
            if experiment is not None:
                sim = pybamm.Simulation(model, parameter_values=param, experiment=experiment)
                sim.solve(calc_esoh=False)
            else:
                sim = pybamm.Simulation(model, parameter_values=param)
                sim.solve(t_eval)
            result_container["solution"] = sim.solution
        except Exception as e:
            result_container["error"] = str(e)

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    thread.join(timeout=timeout_seconds)

    if thread.is_alive():
        raise SimulationTimeoutError(
            f"Simulation timed out after {timeout_seconds}s. "
            "Try SPM instead of DFN, or disable degradation."
        )
    if result_container["error"]:
        raise RuntimeError(f"Simulation failed: {result_container['error']}")

    return result_container["solution"]
