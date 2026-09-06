import pytest
from backend.app.services.fair_price_engine import fair_price_engine

def test_fair_price_calculation_standard():
    res = fair_price_engine.calculate_fair_price(
        base_benchmark_price=340.0,
        min_market_price=310.0,
        max_market_price=380.0,
        weight_kg=18.0,
        condition_grade="MIXED_GOOD",
        city="Mumbai"
    )
    
    assert res["weight_kg"] == 18.0
    assert res["expected_market_price_inr"] == round(340.0 * 18.0, 2)
    assert res["estimated_fair_min_inr"] == round(310.0 * 18.0, 2)
    assert res["estimated_fair_max_inr"] == round(380.0 * 18.0, 2)
    assert res["fairness_score"] is None

def test_fair_price_with_lowball_offer():
    expected_total = 340.0 * 18.0 # 6120 INR
    lowball_offer = 3500.0        # significantly below
    
    res = fair_price_engine.calculate_fair_price(
        base_benchmark_price=340.0,
        min_market_price=310.0,
        max_market_price=380.0,
        weight_kg=18.0,
        condition_grade="MIXED_GOOD",
        city="Mumbai",
        recycler_offer_inr=lowball_offer
    )
    
    assert res["deviation_percentage"] < -30.0
    assert res["fairness_score"] < 60.0
    assert res["potential_undervaluation_inr"] > 2000.0
    assert "₹" in res["negotiation_script_en"]
    assert "स्थानीय" in res["negotiation_script_hi"]

def test_fair_price_condition_multipliers():
    high_grade = fair_price_engine.calculate_fair_price(
        base_benchmark_price=100.0, min_market_price=90.0, max_market_price=110.0,
        weight_kg=10.0, condition_grade="HIGH_GRADE"
    )
    contaminated = fair_price_engine.calculate_fair_price(
        base_benchmark_price=100.0, min_market_price=90.0, max_market_price=110.0,
        weight_kg=10.0, condition_grade="CONTAMINATED"
    )
    assert high_grade["expected_market_price_inr"] > contaminated["expected_market_price_inr"]
