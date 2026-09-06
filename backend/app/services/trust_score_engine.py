from typing import Dict, Any

class TrustScoreEngine:
    """
    Recycler Trust Scoring Engine based on quantifiable compliance,
    authorization status, quote adherence, and operational dispute rate.
    """

    def calculate_trust_score(
        self,
        authorization_status: str,
        transaction_completion_rate: float,
        quote_accuracy_rate: float,
        dispute_rate: float,
        avg_response_time_minutes: float
    ) -> float:
        # Weighting:
        # 1. Authorization: 35%
        # 2. Completion rate: 25%
        # 3. Quote accuracy: 20%
        # 4. Low disputes: 15%
        # 5. Response speed: 5%
        
        auth_score = 0.0
        if authorization_status == "VERIFIED":
            auth_score = 100.0
        elif authorization_status == "PENDING_VERIFICATION":
            auth_score = 70.0
        elif authorization_status == "EXPIRED":
            auth_score = 40.0
        else:
            auth_score = 20.0
            
        comp_score = min(100.0, transaction_completion_rate)
        quote_score = min(100.0, quote_accuracy_rate)
        
        # Dispute penalty: 0% dispute = 100 score, >5% dispute drops significantly
        dispute_score = max(0.0, 100.0 - (dispute_rate * 12.0))
        
        # Response time: <15 mins = 100, 60 mins = 60
        resp_score = max(30.0, 100.0 - (avg_response_time_minutes / 2.0))
        
        total_trust = (
            auth_score * 0.35 +
            comp_score * 0.25 +
            quote_score * 0.20 +
            dispute_score * 0.15 +
            resp_score * 0.05
        )
        
        return round(total_trust, 1)

trust_score_engine = TrustScoreEngine()
