import numpy as np
from typing import List, Dict, Any, Tuple

class SafetyEngine:
    """
    Enforces aerospace mission-critical safety bounds, physical limits,
    and calculates statistical lot safety slopes.
    """

    @staticmethod
    def calculate_lot_safety_slope(slopes: List[float], sensitivity: float = 0.75) -> float:
        """
        Calculates maximum allowable degradation slope before thermal runaway:
        Safety Slope = Median(slopes) + k * (1.4826 * MAD(slopes)).
        """
        valid = [s for s in slopes if s is not None and not np.isnan(s) and not np.isinf(s)]
        if len(valid) < 5:
            return 0.034  # Nominal aerospace baseline (0.034 µA/hr for 500K gates)

        arr = np.array(valid, dtype=float)
        median_slope = float(np.median(arr))
        mad_slope = float(np.median(np.abs(arr - median_slope)))
        robust_sigma = 1.4826 * mad_slope if mad_slope > 1e-5 else 0.005

        # Higher sensitivity tightens safety margin
        k = max(2.0, min(4.5, 4.5 - sensitivity * 2.0))
        safety_slope = median_slope + k * robust_sigma
        return round(float(max(0.015, safety_slope)), 4)

    @staticmethod
    def check_physical_boundaries(parameters: Dict[str, float], environment: Dict[str, float]) -> Tuple[bool, List[str]]:
        violations = []
        for param, val in parameters.items():
            if val < 0 and param in ("iddq_ua", "leakage_na", "prop_delay_ns"):
                violations.append(f"NEGATIVE_VALUE: {param}={val}")
            if param == "iddq_ua" and val > 2000.0:
                violations.append(f"SATURATION_EXCEEDED: iddq={val}µA > 2000µA")

        temp = environment.get("temperature_c")
        if temp is not None and (temp < -55.0 or temp > 250.0):
            violations.append(f"THERMAL_BOUNDARY_EXCEEDED: temp={temp}°C")

        return len(violations) == 0, violations
