import pybamm
from typing import Optional


def build_experiment(
    experiment_type: str,
    c_rate: float,
    cutoff_voltage: float,
    upper_voltage: float = 4.2,
    num_cycles: int = 1,
    custom_steps: Optional[str] = None,
    duration_minutes: Optional[int] = None,
) -> tuple:
    """
    Returns (experiment_or_None, t_eval_or_None, initial_soc).
    """
    c_str = f"{c_rate}C"

    if experiment_type == 'discharge':
        steps = [f"Discharge at {c_str} until {cutoff_voltage}V"]
        return pybamm.Experiment(steps * num_cycles), None, 1.0

    elif experiment_type == 'charge':
        steps = [
            f"Charge at {c_str} until {upper_voltage}V",
            f"Hold at {upper_voltage}V until C/20",
        ]
        return pybamm.Experiment(steps), None, 0.1

    elif experiment_type == 'charge_discharge':
        one_cycle = (
            f"Discharge at {c_str} until {cutoff_voltage}V",
            "Rest for 5 minutes",
            f"Charge at {c_str} until {upper_voltage}V",
            f"Hold at {upper_voltage}V until C/20",
            "Rest for 5 minutes",
        )
        return pybamm.Experiment([one_cycle] * num_cycles), None, 1.0

    elif experiment_type == 'rate_capability':
        # Multiple C-rates in sequence
        steps = []
        for rate in [0.1, 0.2, 0.5, 1.0, 2.0, 3.0]:
            steps.append(f"Discharge at {rate}C until {cutoff_voltage}V")
            steps.append(f"Charge at 0.5C until {upper_voltage}V")
            steps.append(f"Hold at {upper_voltage}V until C/20")
            steps.append("Rest for 10 minutes")
        return pybamm.Experiment(steps), None, 1.0

    elif experiment_type == 'hppc':
        steps = []
        for _ in range(5):
            steps += [
                f"Discharge at {c_str} for 10 seconds",
                "Rest for 40 seconds",
                f"Charge at {c_str} for 10 seconds",
                "Rest for 40 seconds",
            ]
        return pybamm.Experiment(steps), None, 0.7

    elif experiment_type == 'drive_cycle':
        # Simplified WLTP-like pulse pattern
        steps = []
        for _ in range(3):
            steps += [
                f"Discharge at {c_str} for 30 seconds",
                "Rest for 10 seconds",
                f"Discharge at {min(c_rate*2, 5)}C for 10 seconds",
                "Rest for 5 seconds",
                f"Charge at {c_str} for 15 seconds",
                "Rest for 10 seconds",
            ]
        return pybamm.Experiment(steps), None, 0.8

    elif experiment_type == 'cccv':
        steps = [
            f"Charge at {c_str} until {upper_voltage}V",
            f"Hold at {upper_voltage}V until C/50",
        ]
        return pybamm.Experiment(steps), None, 0.1

    elif experiment_type == 'rest':
        max_seconds = min((duration_minutes or 60) * 60, 7200)
        return None, [0, max_seconds], 0.5

    elif experiment_type == 'constant_current':
        max_seconds = min((duration_minutes or 60) * 60, 7200)
        return None, [0, max_seconds], 1.0

    elif experiment_type == 'custom':
        if not custom_steps:
            raise ValueError("Custom steps string required for custom experiment type")
        # Parse newline-separated steps
        lines = [l.strip() for l in custom_steps.strip().split('\n') if l.strip()]
        return pybamm.Experiment(lines), None, 1.0

    else:
        raise ValueError(f"Unknown experiment type: {experiment_type}")
