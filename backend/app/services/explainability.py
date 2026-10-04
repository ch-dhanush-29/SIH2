from typing import Dict, List, Any

class ExplainabilityEngine:
    """
    Glass-box Explainability Service for QA and Reliability Inspectors.
    Provides plain-English decision justifications and SHAP-style feature attributions.
    """

    @staticmethod
    def generate_plain_english_report(
        part_id: str,
        parameter: str,
        checkpoint: int,
        measured_val: float,
        lot_median: float,
        robust_z: float,
        static_limit: float,
        dynamic_limit: float,
        drift_slope: float,
        safety_slope: float,
        predicted_168h: float,
        final_verdict: str,
        early_reject: bool
    ) -> str:
        """
        Produces natural language summary explaining exact statistical rationale.
        """
        param_units = {"iddq": "µA", "leakage": "nA", "propDelay": "ns"}.get(parameter, "units")
        ratio_median = measured_val / max(lot_median, 1e-4)

        if final_verdict == "PASS":
            return (
                f"{part_id} shows nominal behavior at {checkpoint}h. Measured {parameter} ({measured_val:.2f} {param_units}) "
                f"is close to lot median ({lot_median:.2f} {param_units}, robust z = {robust_z:+.1f}). "
                f"Drift slope ({drift_slope:.4f} {param_units}/h) is well below the lot safety slope ({safety_slope:.4f} {param_units}/h). "
                f"Predicted 168h value ({predicted_168h:.2f} {param_units}) safely clears dynamic ({dynamic_limit:.2f} {param_units}) "
                f"and static ({static_limit:.2f} {param_units}) limits."
            )

        # Suspect or Reject
        justification_parts = []
        if measured_val > static_limit:
            justification_parts.append(
                f"FAILED static datasheet limit ({measured_val:.2f} > {static_limit:.2f} {param_units})"
            )
        else:
            justification_parts.append(
                f"Passes static limit ({measured_val:.2f} <= {static_limit:.2f} {param_units})"
            )

        if ratio_median >= 1.5 or abs(robust_z) >= 3.0:
            justification_parts.append(
                f"measured {parameter} at {checkpoint}h is {ratio_median:.1f}× the lot median ({lot_median:.2f} {param_units}, robust z = {robust_z:+.1f})"
            )

        if drift_slope > safety_slope:
            slope_mult = drift_slope / max(safety_slope, 1e-5)
            justification_parts.append(
                f"drift slope ({drift_slope:.4f} {param_units}/h) is {slope_mult:.1f}× the lot safety slope ({safety_slope:.4f} {param_units}/h)"
            )

        if predicted_168h > dynamic_limit:
            justification_parts.append(
                f"predicted 168h value ({predicted_168h:.2f} {param_units}) breaches the dynamic lot ceiling ({dynamic_limit:.2f} {param_units})"
            )

        if early_reject:
            justification_parts.append(
                "Triggered EARLY REJECT at 24h, saving 144 hours of chamber burn-in time"
            )

        full_text = f"{part_id} flagged as {final_verdict}: " + "; ".join(justification_parts) + "."
        return full_text

    @staticmethod
    def calculate_shap_attributions(
        robust_z: float,
        drift_slope: float,
        safety_slope: float,
        iforest_score: float,
        headroom_pct: float
    ) -> List[Dict[str, Any]]:
        """
        Calculates normalized feature attribution impacts resembling SHAP values.
        """
        # Feature 1: Drift slope vs safety slope
        slope_impact = max(0.0, (drift_slope / max(safety_slope, 1e-4) - 1.0) * 35.0)
        
        # Feature 2: Robust Z-score deviation from median
        z_impact = max(0.0, (robust_z - 1.5) * 8.0)
        
        # Feature 3: Isolation Forest Outlier score
        iforest_impact = (iforest_score / 100.0) * 20.0
        
        # Feature 4: Dynamic limit headroom depletion
        headroom_impact = max(0.0, (1.0 - headroom_pct) * 25.0)

        total_impact = slope_impact + z_impact + iforest_impact + headroom_impact
        scale = 100.0 / max(total_impact, 1e-4) if total_impact > 0 else 1.0

        return [
            {"feature": "Drift Slope vs Safety Threshold", "impact": round(slope_impact * scale, 1), "direction": "positive"},
            {"feature": "Robust Z-Score (MAD from Median)", "impact": round(z_impact * scale, 1), "direction": "positive"},
            {"feature": "Multivariate Isolation Forest", "impact": round(iforest_impact * scale, 1), "direction": "positive"},
            {"feature": "Dynamic Limit Headroom Depletion", "impact": round(headroom_impact * scale, 1), "direction": "positive"}
        ]
