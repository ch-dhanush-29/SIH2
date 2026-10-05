import logging
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime, timezone

from backend.app.services.screening.schemas import (
    ScreeningEvaluationResult,
    BaselineStats,
    AnomalyScoreResult,
    ForecastResult,
    ConfidenceResult
)
from backend.app.services.screening.baseline import DynamicBaselineEngine
from backend.app.services.screening.anomaly import DynamicAnomalyDetector
from backend.app.services.screening.forecasting import EarlyForecastingEngine
from backend.app.services.screening.confidence import ConfidenceCalculator
from backend.app.services.screening.decision import DecisionEngine
from backend.app.services.screening.explainability import ExplainabilityEngine

logger = logging.getLogger("burnwatch.screening.engine")

class ScreeningEngine:
    """
    Authoritative Single Point of Truth Screening Engine for BurnWatch 3D.
    Used universally by:
      - Single Telemetry Ingestion
      - Batch Telemetry Ingestion
      - Asynchronous Screening Worker
      - Golden Demo Orchestrator
      - Replay & Hardware Ingress Adapters
    Zero duplicate AI screening logic across the platform.
    """
    MODEL_VERSION = "burnwatch-anomaly-v3.2.1"
    FEATURE_VERSION = "features-v1.5"
    THRESHOLD_VERSION = "thresholds-v2026.10"

    def __init__(self):
        # In-memory baseline cache: (lot_id, param) -> BaselineStats
        self._baseline_cache: Dict[str, BaselineStats] = {}

    def get_cached_baseline(self, lot_id: str, param: str) -> Optional[BaselineStats]:
        return self._baseline_cache.get(f"{lot_id}:{param}")

    def cache_baseline(self, lot_id: str, param: str, baseline: BaselineStats) -> None:
        self._baseline_cache[f"{lot_id}:{param}"] = baseline

    def invalidate_cache(self, lot_id: Optional[str] = None):
        if lot_id:
            keys_to_del = [k for k in self._baseline_cache if k.startswith(f"{lot_id}:")]
            for k in keys_to_del:
                self._baseline_cache.pop(k, None)
        else:
            self._baseline_cache.clear()

    async def evaluate(
        self,
        component_id: str,
        lot_id: str,
        parameter: str,
        value: float,
        quality_status: str = "VALID",
        v_0h: Optional[float] = None,
        v_24h: Optional[float] = None,
        peer_readings: Optional[List[float]] = None,
        static_limit: float = 50.0,
        sensitivity: float = 0.75,
        target_hour: int = 168
    ) -> ScreeningEvaluationResult:
        """
        Executes unified screening pipeline:
        1. Dynamic Baseline Acquisition
        2. Module A: Multi-Layer Anomaly Detection
        3. Module B: Early Degradation Forecasting
        4. Dynamic Confidence Calculation
        5. Decision Synthesis
        6. Explainability Generation
        """
        # 1. Acquire Baseline
        cache_key = f"{lot_id}:{parameter}"
        baseline = self._baseline_cache.get(cache_key)

        if baseline is None:
            if peer_readings and len(peer_readings) >= 5:
                baseline = DynamicBaselineEngine.calculate_baseline(
                    values=peer_readings,
                    parameter=parameter,
                    static_limit=static_limit,
                    sensitivity=sensitivity
                )
                self._baseline_cache[cache_key] = baseline
            else:
                # Physics fallback with is_sufficient=False to enforce review/insufficient data
                baseline = BaselineStats(
                    parameter=parameter,
                    median=21.2,
                    mad=1.1,
                    mean=21.2,
                    std=1.5,
                    q1=20.4,
                    q3=22.0,
                    iqr=1.6,
                    robust_sigma=1.63,
                    dynamic_upper_limit=28.5,
                    static_limit=static_limit,
                    safety_slope=0.034,
                    sample_count=len(peer_readings) if peer_readings else 0,
                    is_sufficient=peer_readings is not None and len(peer_readings) >= 5
                )

        # 2. Module A: Anomaly Detection
        anomaly_res = DynamicAnomalyDetector.evaluate(
            value=value,
            baseline=baseline,
            v_0h=v_0h
        )

        # 3. Module B: Early Forecasting (if both 0h and 24h readings are available)
        forecast_res = None
        if v_0h is not None and v_24h is not None:
            forecast_res = EarlyForecastingEngine.forecast(
                v_0h=v_0h,
                v_24h=v_24h,
                safety_slope=baseline.safety_slope,
                static_limit=baseline.static_limit,
                robust_sigma=baseline.robust_sigma,
                target_hour=target_hour
            )

        # 4. Dynamic Confidence Calculation
        confidence_res = ConfidenceCalculator.calculate(
            quality_status=quality_status,
            baseline=baseline,
            anomaly_res=anomaly_res,
            forecast_res=forecast_res
        )

        # 5. Authoritative Decision Synthesis
        decision = DecisionEngine.evaluate(
            quality_status=quality_status,
            anomaly_res=anomaly_res,
            confidence_res=confidence_res,
            baseline=baseline,
            forecast_res=forecast_res
        )

        # 6. Verifiable Engineering Explainability
        reasons = ExplainabilityEngine.generate_reasons(
            parameter=parameter,
            value=value,
            baseline=baseline,
            anomaly_res=anomaly_res,
            forecast_res=forecast_res
        )

        return ScreeningEvaluationResult(
            inference_id=str(uuid.uuid4()),
            component_id=component_id,
            lot_id=lot_id,
            parameter=parameter,
            measured_value=round(float(value), 3),
            quality_status=quality_status,
            anomaly_score=anomaly_res.ensemble_score,
            risk_level=anomaly_res.risk_level,
            decision=decision,
            confidence=confidence_res.confidence,
            reasons=reasons,
            forecast=forecast_res,
            baseline=baseline,
            model_version=self.MODEL_VERSION,
            feature_version=self.FEATURE_VERSION,
            threshold_version=self.THRESHOLD_VERSION,
            created_at=datetime.now(timezone.utc).isoformat()
        )

# Global Singleton Screening Engine
screening_engine = ScreeningEngine()
