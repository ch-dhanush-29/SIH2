import numpy as np
from typing import Dict, List, Any

class FeatureEngineer:
    """
    Extracts screening features for Module A (Dynamic Outlier Detection) 
    and Module B (Time-Series Drift Prediction) with strict temporal partitioning.
    
    CRITICAL SAFETY CONSTRAINT:
    At checkpoint 24h, feature engineering strictly forbids access to 96h and 168h data.
    Zero data leakage guaranteed.
    """
    
    @staticmethod
    def compute_lot_robust_stats(values: np.ndarray) -> Dict[str, float]:
        """Computes median, MAD, robust sigma, and IQR for a lot measurement array."""
        clean_vals = values[~np.isnan(values)]
        if len(clean_vals) == 0:
            return {"median": 0.0, "mad": 1e-4, "robust_sigma": 1.4826e-4, "q1": 0.0, "q3": 0.0, "iqr": 1e-4}
        
        median_val = float(np.median(clean_vals))
        abs_dev = np.abs(clean_vals - median_val)
        mad = float(np.median(abs_dev))
        if mad < 1e-5:
            mad = 1e-5
        robust_sigma = 1.4826 * mad
        
        q25, q75 = np.percentile(clean_vals, [25, 75])
        iqr = float(q75 - q25)
        if iqr < 1e-5:
            iqr = 1e-5
            
        return {
            "median": median_val,
            "mad": mad,
            "robust_sigma": robust_sigma,
            "q1": float(q25),
            "q3": float(q75),
            "iqr": iqr
        }

    @staticmethod
    def extract_checkpoint_features(
        v_0h: float,
        v_24h: float,
        lot_stats_0h: Dict[str, float],
        lot_stats_24h: Dict[str, float],
        lot_slope_stats: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Extracts features at early screening gate (24h).
        Guaranteed zero access to future values (96h, 168h).
        """
        # Module A Outlier features
        robust_z_0h = (v_0h - lot_stats_0h["median"]) / lot_stats_0h["robust_sigma"]
        robust_z_24h = (v_24h - lot_stats_24h["median"]) / lot_stats_24h["robust_sigma"]
        iqr_dist_24h = (v_24h - lot_stats_24h["q3"]) / lot_stats_24h["iqr"]
        
        # Module B Drift features
        delta_24h = v_24h - v_0h
        drift_slope = delta_24h / 24.0
        drift_ratio = v_24h / max(abs(v_0h), 1e-4)
        
        # Deviation from lot typical drift slope
        slope_robust_z = (drift_slope - lot_slope_stats["median"]) / lot_slope_stats["robust_sigma"]
        
        return {
            "v_0h": float(v_0h),
            "v_24h": float(v_24h),
            "robust_z_0h": float(robust_z_0h),
            "robust_z_24h": float(robust_z_24h),
            "iqr_dist_24h": float(iqr_dist_24h),
            "delta_24h": float(delta_24h),
            "drift_slope": float(drift_slope),
            "drift_ratio": float(drift_ratio),
            "slope_robust_z": float(slope_robust_z)
        }
