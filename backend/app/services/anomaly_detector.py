import imagehash
from PIL import Image
import io
import math
from typing import Dict, Any, List, Optional
from datetime import datetime

class AnomalyDetector:
    """
    Transaction & Marketplace Anomaly Detection Engine.
    Detects abnormal undervaluation, price gouging, perceptual duplicate lot submissions,
    and suspicious weight/value combination outliers.
    """

    def check_price_anomaly(
        self,
        offered_price: float,
        expected_benchmark_price: float,
        threshold_pct: float = 25.0
    ) -> Optional[Dict[str, Any]]:
        """
        Flags if a recycler offer deviates significantly below or above historical benchmark.
        """
        if expected_benchmark_price <= 0:
            return None
            
        deviation_pct = ((offered_price - expected_benchmark_price) / expected_benchmark_price) * 100.0
        
        if deviation_pct < -threshold_pct:
            severity = "HIGH" if deviation_pct < -35.0 else "MEDIUM"
            return {
                "anomaly_type": "UNDERVALUATION_SUSPECT",
                "severity": severity,
                "expected_benchmark_value": round(expected_benchmark_price, 2),
                "observed_value": round(offered_price, 2),
                "deviation_percentage": round(deviation_pct, 1),
                "explanation": f"Quote is {abs(round(deviation_pct, 1))}% below local historical benchmark of ₹{round(expected_benchmark_price, 2)}. Potential collector undervaluation."
            }
        elif deviation_pct > 50.0:
            return {
                "anomaly_type": "PRICE_SPIKE",
                "severity": "LOW",
                "expected_benchmark_value": round(expected_benchmark_price, 2),
                "observed_value": round(offered_price, 2),
                "deviation_percentage": round(deviation_pct, 1),
                "explanation": f"Offer is {round(deviation_pct, 1)}% higher than standard benchmark. Check if premium grade or subsidy is attached."
            }
        return None

    def compute_perceptual_hash(self, image_bytes: bytes) -> str:
        """
        Computes 64-bit difference hash (dHash) for duplicate photo detection.
        """
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("L")
            h = imagehash.dhash(img)
            return str(h)
        except Exception:
            return "0000000000000000"

    def check_duplicate_image(
        self,
        new_hash_str: str,
        existing_hashes: List[Dict[str, Any]],
        max_hamming_distance: int = 6
    ) -> Optional[Dict[str, Any]]:
        """
        Checks if the image hash is within hamming distance threshold of existing lots.
        """
        if not new_hash_str or new_hash_str == "0000000000000000":
            return None
            
        try:
            new_h = imagehash.hex_to_hash(new_hash_str)
            for item in existing_hashes:
                old_h = imagehash.hex_to_hash(item["hash"])
                dist = new_h - old_h
                if dist <= max_hamming_distance:
                    return {
                        "anomaly_type": "DUPLICATE_IMAGE",
                        "severity": "HIGH",
                        "matched_lot_code": item.get("lot_code"),
                        "matched_lot_id": item.get("lot_id"),
                        "hamming_distance": dist,
                        "explanation": f"Submitted image visually matches prior lot {item.get('lot_code')} (Hamming distance {dist} <= {max_hamming_distance}). Possible duplicate or fraudulent claim."
                    }
        except Exception:
            pass
        return None

    def check_weight_handover_discrepancy(
        self,
        collector_weight_kg: float,
        verified_weight_kg: float,
        tolerance_pct: float = 15.0
    ) -> Optional[Dict[str, Any]]:
        """
        Flags substantial variance between collector approximate weight and verified scale weight.
        """
        if collector_weight_kg <= 0:
            return None
            
        diff_kg = verified_weight_kg - collector_weight_kg
        diff_pct = (diff_kg / collector_weight_kg) * 100.0
        
        if abs(diff_pct) > tolerance_pct:
            severity = "MEDIUM" if abs(diff_pct) <= 30.0 else "HIGH"
            return {
                "anomaly_type": "WEIGHT_MISMATCH",
                "severity": severity,
                "expected_benchmark_value": collector_weight_kg,
                "observed_value": verified_weight_kg,
                "deviation_percentage": round(diff_pct, 1),
                "explanation": f"Scale weight ({verified_weight_kg}kg) deviates by {round(diff_pct, 1)}% from initial estimate ({collector_weight_kg}kg)."
            }
        return None

anomaly_detector = AnomalyDetector()
