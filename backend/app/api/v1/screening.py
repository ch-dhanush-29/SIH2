import json
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.component import Component
from backend.app.models.measurement import Measurement
from backend.app.models.screening import ScreeningResult, QADecision
from backend.app.models.lot import Lot
from backend.app.models.user import User
from backend.app.schemas.screening import (
    ScreeningRequest,
    ScreeningRunResponse,
    ScreeningResultDetail,
    DecisionOverrideRequest,
    ShapAttribution
)
from backend.app.services.feature_engineering import FeatureEngineer
from backend.app.services.drift_predictor import DriftPredictor
from backend.app.services.anomaly_detector import DynamicAnomalyDetector
from backend.app.services.risk_engine import ScreeningRiskEngine
from backend.app.services.explainability import ExplainabilityEngine
from backend.app.api.deps import get_current_user, require_roles, log_audit_event

router = APIRouter(prefix="/screening", tags=["Screening & Inference Engine"])

@router.post("/run", response_model=ScreeningRunResponse)
def run_screening(
    req: ScreeningRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    param = req.parameter
    checkpoint = req.checkpoint
    sensitivity = req.sensitivity
    static_limit = settings.STATIC_LIMITS.get(param, 50.0)

    # Fetch components and measurements for this lot
    comps = db.query(Component).filter(Component.lot_id == req.lot_id).all()
    if not comps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Lot '{req.lot_id}' not found or has no components.")

    comp_ids = [c.id for c in comps]
    meas_list = db.query(Measurement).filter(
        Measurement.component_id.in_(comp_ids),
        Measurement.parameter == param
    ).all()

    meas_map = {m.component_id: m for m in meas_list}

    # Extract values for checkpoint and slopes
    checkpoint_attr = f"v_{checkpoint}h"
    vals_0h = []
    vals_chk = []
    slopes = []

    valid_comps = []
    for c in comps:
        m = meas_map.get(c.id)
        if not m:
            continue
        v_0 = getattr(m, "v_0h", None)
        v_chk = getattr(m, checkpoint_attr, None)
        if v_0 is None or v_chk is None:
            continue
        vals_0h.append(v_0)
        vals_chk.append(v_chk)
        v_24 = getattr(m, "v_24h", v_0)
        slopes.append((v_24 - v_0) / 24.0)
        valid_comps.append((c, m))

    if not valid_comps:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid measurements found for the specified checkpoint.")

    vals_chk_arr = np.array(vals_chk, dtype=float)
    slopes_arr = np.array(slopes, dtype=float)

    # 1. Compute dynamic limits and stats for this lot
    lot_stats = DynamicAnomalyDetector.compute_dynamic_limits(vals_chk_arr, static_limit, sensitivity)
    dynamic_limit = lot_stats["dynamic_limit"]

    # 2. Compute safety slope for this lot
    slope_stats = DriftPredictor.calculate_lot_safety_slope(slopes_arr, sensitivity)
    safety_slope = slope_stats["safety_slope"]

    # 3. Isolation Forest features
    features_list = []
    for (c, m) in valid_comps:
        v_0 = m.v_0h
        v_chk = getattr(m, checkpoint_attr)
        slope = (m.v_24h - v_0) / 24.0
        features_list.append([v_chk, slope, v_chk - v_0])
    features_arr = np.array(features_list, dtype=float)
    iforest_scores = DynamicAnomalyDetector.run_isolation_forest(features_arr)

    # 4. Score each component
    results: List[ScreeningResultDetail] = []
    tp, fp, tn, fn = 0, 0, 0, 0
    mae_diffs = []
    total_time_saved = 0.0
    pass_cnt, rev_cnt, rej_cnt, early_rej_cnt = 0, 0, 0, 0

    for idx, (comp, meas) in enumerate(valid_comps):
        v_0 = meas.v_0h
        v_24 = meas.v_24h
        v_chk = getattr(meas, checkpoint_attr)
        actual_168h = getattr(meas, "v_168h", None)

        # Drift forecast (Module B)
        forecast = DriftPredictor.forecast_168h(v_0, v_24, safety_slope, dynamic_limit, static_limit)
        drift_slope = forecast["drift_slope"]
        pred_168h = forecast["predicted_168h"]
        early_reject = forecast["early_reject"]
        time_saved = forecast["time_saved_hours"]

        # Anomaly scoring (Module A)
        anomaly_res = DynamicAnomalyDetector.score_component(
            value=v_chk,
            v_0h=v_0,
            static_limit=static_limit,
            lot_stats=lot_stats,
            iforest_score=float(iforest_scores[idx]),
            drift_slope=drift_slope,
            safety_slope=safety_slope,
            sensitivity=sensitivity
        )

        # Unified 3-way risk assessment
        risk_res = ScreeningRiskEngine.evaluate(
            passes_static=anomaly_res["passes_static"],
            passes_dynamic=anomaly_res["passes_dynamic"],
            passes_drift=anomaly_res["passes_drift"],
            early_reject=early_reject,
            ensemble_score=anomaly_res["ensemble_score"],
            robust_z=anomaly_res["robust_z_score"],
            predicted_168h=pred_168h,
            dynamic_limit=dynamic_limit,
            static_limit=static_limit
        )

        final_verdict = risk_res["final_verdict"]
        risk_score = risk_res["risk_score"]

        # Counter tallies
        if final_verdict == "PASS":
            pass_cnt += 1
        elif final_verdict == "REVIEW":
            rev_cnt += 1
        else:
            rej_cnt += 1

        if early_reject:
            early_rej_cnt += 1
            total_time_saved += time_saved

        # Plain english report and SHAP
        headroom = max(0.0, min(1.0, (dynamic_limit - v_chk) / max(dynamic_limit, 1e-4)))
        plain_report = ExplainabilityEngine.generate_plain_english_report(
            part_id=comp.part_id,
            parameter=param,
            checkpoint=checkpoint,
            measured_val=v_chk,
            lot_median=lot_stats["median"],
            robust_z=anomaly_res["robust_z_score"],
            static_limit=static_limit,
            dynamic_limit=dynamic_limit,
            drift_slope=drift_slope,
            safety_slope=safety_slope,
            predicted_168h=pred_168h,
            final_verdict=final_verdict,
            early_reject=early_reject
        )

        raw_shap = ExplainabilityEngine.calculate_shap_attributions(
            robust_z=anomaly_res["robust_z_score"],
            drift_slope=drift_slope,
            safety_slope=safety_slope,
            iforest_score=anomaly_res["iforest_score"],
            headroom_pct=headroom
        )
        shap_models = [ShapAttribution(**s) for s in raw_shap]

        # Evaluation metrics vs ground truth
        is_gt_defect = comp.is_ground_truth_defect or (comp.defect_type in ["HARD_FAIL", "LATENT_DRIFT"])
        model_flagged = (final_verdict in ["REVIEW", "REJECT"])

        if model_flagged and is_gt_defect:
            tp += 1
        elif model_flagged and not is_gt_defect:
            fp += 1
        elif not model_flagged and not is_gt_defect:
            tn += 1
        elif not model_flagged and is_gt_defect:
            fn += 1

        if actual_168h is not None:
            mae_diffs.append(abs(pred_168h - actual_168h))

        # Update component status in DB
        comp.status = final_verdict
        comp.risk_score = risk_score

        res_detail = ScreeningResultDetail(
            component_id=comp.id,
            part_id=comp.part_id,
            lot_id=comp.lot_id,
            parameter=param,
            checkpoint=checkpoint,
            static_verdict=anomaly_res["static_verdict"],
            dynamic_verdict=anomaly_res["dynamic_verdict"],
            drift_verdict=anomaly_res["drift_verdict"],
            final_verdict=final_verdict,
            risk_score=risk_score,
            robust_z_score=anomaly_res["robust_z_score"],
            iqr_score=anomaly_res["iqr_score"],
            iforest_score=anomaly_res["iforest_score"],
            ensemble_score=anomaly_res["ensemble_score"],
            measured_value=round(v_chk, 3),
            predicted_168h=pred_168h,
            drift_slope=round(drift_slope, 4),
            safety_slope=round(safety_slope, 4),
            early_reject_flag=early_reject,
            time_saved_hours=time_saved,
            plain_english_justification=plain_report,
            shap_values=shap_models,
            is_ground_truth_defect=is_gt_defect,
            defect_type=comp.defect_type or "NORMAL"
        )
        results.append(res_detail)

    db.commit()

    # Metrics computation
    total_screened = len(valid_comps)
    recall = round(tp / max(tp + fn, 1), 4)
    precision = round(tp / max(tp + fp, 1), 4)
    beta = 2.0
    f2_score = round((1 + beta**2) * (precision * recall) / max(((beta**2 * precision) + recall), 1e-6), 4)
    mae_168h = round(float(np.mean(mae_diffs)), 3) if mae_diffs else 0.0
    cost_score = round(fn * 500.0 + fp * 10.0, 1)

    # Update lot metrics in DB
    lot = db.query(Lot).filter(Lot.lot_id == req.lot_id).first()
    if lot:
        lot.screened_parts = total_screened
        lot.anomaly_count = rej_cnt + rev_cnt
        lot.median_iddq = lot_stats["median"]
        lot.mad_iddq = lot_stats["mad"]
        lot.median_slope = slope_stats["median_slope"]
        lot.safety_slope = safety_slope
        db.commit()

    log_audit_event(
        db, current_user, "SCREENING_RUN", "LOT", req.lot_id,
        {"checkpoint": checkpoint, "sensitivity": sensitivity, "recalled": recall, "fn": fn, "time_saved_hours": total_time_saved},
        request
    )

    return ScreeningRunResponse(
        lot_id=req.lot_id,
        parameter=param,
        checkpoint=checkpoint,
        sensitivity=sensitivity,
        method=req.method,
        total_screened=total_screened,
        pass_count=pass_cnt,
        review_count=rev_cnt,
        reject_count=rej_cnt,
        early_reject_count=early_rej_cnt,
        total_time_saved_hours=total_time_saved,
        tp=tp,
        fp=fp,
        tn=tn,
        fn=fn,
        recall=recall,
        precision=precision,
        f2_score=f2_score,
        mae_168h=mae_168h,
        cost_score=cost_score,
        escaped_defects=fn,
        static_limit=static_limit,
        dynamic_limit=dynamic_limit,
        lot_median=lot_stats["median"],
        lot_mad=lot_stats["mad"],
        lot_safety_slope=safety_slope,
        results=results
    )

@router.post("/override")
def override_qa_decision(
    req: DecisionOverrideRequest,
    request: Request,
    current_user: User = Depends(require_roles(["ADMIN", "QA_INSPECTOR"])),
    db: Session = Depends(get_db)
):
    comp = db.query(Component).filter(Component.id == req.component_id).first()
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found.")

    original_verdict = comp.status
    comp.status = req.final_verdict

    decision = QADecision(
        component_id=comp.id,
        lot_id=comp.lot_id,
        inspector_id=current_user.id,
        inspector_username=current_user.username,
        original_verdict=original_verdict,
        final_verdict=req.final_verdict,
        override_reason=req.override_reason,
        is_override=True
    )
    db.add(decision)
    db.commit()

    log_audit_event(
        db, current_user, "DECISION_OVERRIDE", "COMPONENT", comp.part_id,
        {"from": original_verdict, "to": req.final_verdict, "reason": req.override_reason},
        request
    )

    return {
        "status": "SUCCESS",
        "part_id": comp.part_id,
        "original_verdict": original_verdict,
        "final_verdict": req.final_verdict,
        "inspector": current_user.username,
        "reason": req.override_reason
    }
