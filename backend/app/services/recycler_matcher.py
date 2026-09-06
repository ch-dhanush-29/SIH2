import math
from typing import List, Dict, Any, Optional

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

class RecyclerMatcher:
    """
    Explainable Multi-Factor Recycler Matching Engine.
    Evaluates verified authorization, distance, offered rate, pickup availability,
    completion rate, and trust score without purely sorting by highest price.
    """

    def rank_recyclers(
        self,
        recyclers: List[Any],
        material: Any,
        weight_kg: float,
        collector_lat: float,
        collector_lon: float,
        requires_pickup: bool = True
    ) -> List[Dict[str, Any]]:
        
        matches = []
        base_rate = material.base_benchmark_price
        
        for r in recyclers:
            dist = haversine_distance(collector_lat, collector_lon, r.latitude, r.longitude)
            
            # Service radius check
            in_service_area = dist <= r.service_radius_km
            
            # Calculate offered rate (demo variation based on trust & distance)
            # High trust recyclers offer competitive fair rates
            rate_variation = 1.0 + (r.trust_score - 85.0) / 400.0
            offered_rate = round(base_rate * rate_variation, 2)
            total_payout = round(offered_rate * weight_kg, 2)
            
            # Match Reasons Explainability List
            reasons = []
            if r.authorization_status == "VERIFIED":
                reasons.append("✓ Verified CPCB/MPCB Authorization under EPR 2022")
            else:
                reasons.append("⚠ Pending Authority Verification (Demo)")
                
            if r.pickup_available and weight_kg >= r.min_pickup_weight_kg:
                reasons.append("✓ Doorstep Pickup Available for your weight")
            elif r.pickup_available:
                reasons.append(f"ℹ Self-delivery suggested (pickup minimum is {r.min_pickup_weight_kg}kg)")
            else:
                reasons.append("ℹ Self-delivery to recycling yard")
                
            if dist <= 10.0:
                reasons.append(f"✓ Close proximity ({dist} km away)")
            elif dist <= 25.0:
                reasons.append(f"✓ Within collection corridor ({dist} km)")
            else:
                reasons.append(f"ℹ Distance: {dist} km")
                
            if r.transaction_completion_rate >= 90.0:
                reasons.append(f"✓ High completion reliability ({int(r.transaction_completion_rate)}%)")
                
            if r.trust_score >= 90.0:
                reasons.append(f"✓ Excellent Trust Rating ({int(r.trust_score)}/100)")
                
            # Composite Ranking Score:
            # - Trust score: 30%
            # - Price offer relative to benchmark: 30%
            # - Proximity (inverse distance): 20%
            # - Pickup convenience: 10%
            # - Authorization bonus: 10%
            
            dist_score = max(0.0, 100.0 - (dist * 2.0))
            price_score = min(100.0, (offered_rate / base_rate) * 80.0)
            auth_score = 100.0 if r.authorization_status == "VERIFIED" else 60.0
            pickup_score = 100.0 if (r.pickup_available and weight_kg >= r.min_pickup_weight_kg) else 40.0
            
            ranking_score = (
                (r.trust_score * 0.30) +
                (price_score * 0.30) +
                (dist_score * 0.20) +
                (pickup_score * 0.10) +
                (auth_score * 0.10)
            )
            
            matches.append({
                "recycler_id": r.id,
                "company_name": r.company_name,
                "contact_person": r.contact_person,
                "address": r.address,
                "city": r.city,
                "distance_km": dist,
                "authorization_status": r.authorization_status,
                "authorization_number": r.authorization_number,
                "trust_score": r.trust_score,
                "offered_rate_per_kg": offered_rate,
                "estimated_total_payout_inr": total_payout,
                "pickup_available": r.pickup_available and (weight_kg >= r.min_pickup_weight_kg),
                "response_reliability_pct": r.transaction_completion_rate,
                "ranking_score": round(ranking_score, 2),
                "is_best_match": False,
                "match_reasons": reasons
            })
            
        # Sort by highest ranking score
        matches.sort(key=lambda x: x["ranking_score"], reverse=True)
        if matches:
            matches[0]["is_best_match"] = True
            
        return matches

recycler_matcher = RecyclerMatcher()
