from typing import Dict, Any

class ScreeningRiskEngine:
    """
    Component-Level Decision Engine for High-Reliability Space Systems.
    Synthesizes multi-layer outlier scores and drift forecasts into a 3-way decision:
    PASS / REVIEW / REJECT with zero-compromise recall bias.
    """

    @staticmethod
    def evaluate(
        passes_static: bool,
        passes_dynamic: bool,
        passes_drift: bool,
        early_reject: bool,
        ensemble_score: float,
        robust_z: float,
        predicted_168h: float,
        dynamic_limit: float,
        static_limit: float
    ) -> Dict[str, Any]:
        """
        Computes risk score (0-100) and final 3-way screening verdict.
        """
        # Risk score calculation
        base_risk = ensemble_score
        if not passes_static:
            base_risk = max(base_risk, 95.0)
        if early_reject:
            base_risk = max(base_risk, 85.0)
        if not passes_dynamic:
            base_risk = max(base_risk, 65.0)
        if not passes_drift:
            base_risk = max(base_risk, 70.0)

        risk_score = round(min(100.0, max(0.0, base_risk)), 2)

        # 3-Way Screening Verdict Matrix
        if not passes_static:
            final_verdict = "REJECT"
            reason = "Failed static datasheet limit"
        elif early_reject or risk_score >= 70.0:
            final_verdict = "REJECT"
            reason = "Accelerated drift trajectory exceeds safety envelope"
        elif not passes_dynamic or risk_score >= 40.0 or robust_z >= 3.0:
            final_verdict = "REVIEW"
            reason = "Statistically atypical behavior relative to lot peers"
        else:
            final_verdict = "PASS"
            reason = "Compliant with lot baseline and safety slope"

        return {
            "risk_score": risk_score,
            "final_verdict": final_verdict,
            "decision_reason": reason
        }
