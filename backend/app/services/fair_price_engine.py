from typing import Dict, Any, Optional
import numpy as np

# Condition Grade Multipliers
CONDITION_MULTIPLIERS = {
    "HIGH_GRADE": 1.15,      # High-grade telecom / server PCB or clean sorted copper wire
    "INTACT": 1.05,          # Fully intact devices / motherboards
    "MIXED_GOOD": 1.00,      # Standard mixed collection
    "DISMANTLED": 0.90,      # Broken or partially dismantled
    "DAMAGED": 0.80,         # Heavily corroded or fragmented
    "CONTAMINATED": 0.65     # Contains mixed mud, heavy non-e-waste debris
}

class FairPriceEngine:
    """
    Transparent Fair Price Intelligence Engine.
    Calculates estimated fair value range, expected market price,
    fairness score (0-100), and potential undervaluation without black-box opacity.
    """

    def calculate_fair_price(
        self,
        base_benchmark_price: float,
        min_market_price: float,
        max_market_price: float,
        weight_kg: float,
        condition_grade: str = "MIXED_GOOD",
        city: str = "Mumbai",
        recycler_offer_inr: Optional[float] = None
    ) -> Dict[str, Any]:
        
        condition_mult = CONDITION_MULTIPLIERS.get(condition_grade.upper(), 1.0)
        
        # Quantity incentive multiplier (slight premium for bulk > 50kg)
        bulk_multiplier = 1.0
        if weight_kg >= 100.0:
            bulk_multiplier = 1.06
        elif weight_kg >= 40.0:
            bulk_multiplier = 1.03
            
        effective_rate_per_kg = base_benchmark_price * condition_mult * bulk_multiplier
        min_rate = min_market_price * condition_mult
        max_rate = max_market_price * condition_mult * bulk_multiplier
        
        expected_total_inr = round(effective_rate_per_kg * weight_kg, 2)
        min_fair_total_inr = round(min_rate * weight_kg, 2)
        max_fair_total_inr = round(max_rate * weight_kg, 2)
        
        result = {
            "weight_kg": weight_kg,
            "condition_grade": condition_grade,
            "condition_multiplier": condition_mult,
            "base_rate_per_kg": round(effective_rate_per_kg, 2),
            "local_range_per_kg": f"₹{round(min_rate, 1)} – ₹{round(max_rate, 1)} / kg",
            "estimated_fair_min_inr": min_fair_total_inr,
            "estimated_fair_max_inr": max_fair_total_inr,
            "expected_market_price_inr": expected_total_inr,
            "data_source_badge": "Regional Recycler Benchmarks (Demo Dataset)",
            "recycler_offer_inr": recycler_offer_inr,
            "fairness_score": None,
            "potential_undervaluation_inr": None,
            "deviation_percentage": None,
            "negotiation_script_en": None,
            "negotiation_script_hi": None,
            "negotiation_script_mr": None,
            "explanation": f"Based on {city} regional rates, {condition_grade} condition ({int(condition_mult*100)}%), and {weight_kg}kg batch."
        }
        
        # If a recycler has made an offer, evaluate fairness & undervaluation
        if recycler_offer_inr is not None and recycler_offer_inr > 0:
            deviation_pct = round(((recycler_offer_inr - expected_total_inr) / (expected_total_inr + 1e-5)) * 100, 1)
            result["deviation_percentage"] = deviation_pct
            
            # Fairness score calculation: 100 is at or above expected market price
            # 80-100 is fair/good, 60-79 is moderate, <60 is high undervaluation risk
            ratio = recycler_offer_inr / (expected_total_inr + 1e-5)
            if ratio >= 1.0:
                score = min(100.0, 90.0 + (ratio - 1.0) * 50.0)
            elif ratio >= 0.85:
                score = 75.0 + ((ratio - 0.85) / 0.15) * 15.0
            elif ratio >= 0.70:
                score = 50.0 + ((ratio - 0.70) / 0.15) * 25.0
            else:
                score = max(10.0, (ratio / 0.70) * 50.0)
                
            result["fairness_score"] = round(score, 1)
            
            if recycler_offer_inr < expected_total_inr:
                undervaluation = round(expected_total_inr - recycler_offer_inr, 2)
                result["potential_undervaluation_inr"] = undervaluation
                
                # Negotiation assistant suggestions
                suggested_counter = round(min_fair_total_inr + (expected_total_inr - min_fair_total_inr) * 0.7, -1)
                result["negotiation_script_en"] = (
                    f"The local benchmark rate is around ₹{round(effective_rate_per_kg, 1)}/kg (total ₹{expected_total_inr}). "
                    f"Can you offer ₹{suggested_counter}?"
                )
                result["negotiation_script_hi"] = (
                    f"स्थानीय बाजार में उचित भाव लगभग ₹{round(effective_rate_per_kg, 1)}/kg (कुल ₹{expected_total_inr}) चल रहा है। "
                    f"क्या आप ₹{suggested_counter} दे सकते हैं?"
                )
                result["negotiation_script_mr"] = (
                    f"स्थानिक बाजारात वाजवी दर सुमारे ₹{round(effective_rate_per_kg, 1)}/kg (एकूण ₹{expected_total_inr}) आहे. "
                    f"आपण ₹{suggested_counter} देऊ शकता का?"
                )
            else:
                result["potential_undervaluation_inr"] = 0.0
                result["negotiation_script_en"] = "This offer is at or above the prevailing market benchmark."
                result["negotiation_script_hi"] = "यह ऑफर बाजार भाव के अनुसार बहुत अच्छा और उचित है।"
                result["negotiation_script_mr"] = "ही ऑफर बाजारभावापेक्षा वाजवी आणि चांगली आहे."
                
        return result

fair_price_engine = FairPriceEngine()
