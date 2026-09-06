import pytest
from backend.app.services.recycler_matcher import recycler_matcher, haversine_distance
from backend.app.services.trust_score_engine import trust_score_engine

class MockRecycler:
    def __init__(self, id, company_name, lat, lon, radius, pickup, min_w, trust, auth_status, comp_rate):
        self.id = id
        self.company_name = company_name
        self.contact_person = "Officer"
        self.address = "Industrial Zone"
        self.city = "Mumbai"
        self.latitude = lat
        self.longitude = lon
        self.service_radius_km = radius
        self.pickup_available = pickup
        self.min_pickup_weight_kg = min_w
        self.trust_score = trust
        self.authorization_status = auth_status
        self.authorization_number = "CPCB/AUTH-01"
        self.transaction_completion_rate = comp_rate

class MockMaterial:
    def __init__(self, base_price):
        self.base_benchmark_price = base_price

def test_haversine_distance():
    # Distance between Nariman Point and Bandra (~15km)
    d = haversine_distance(18.9256, 72.8242, 19.0596, 72.8295)
    assert 10.0 < d < 20.0

def test_recycler_ranking_prefers_verified_and_high_trust():
    r1 = MockRecycler(1, "EcoGreen Verified", 19.05, 72.85, 30.0, True, 10.0, 95.0, "VERIFIED", 98.0)
    r2 = MockRecycler(2, "Unverified Far", 19.45, 73.20, 10.0, False, 50.0, 50.0, "PENDING_VERIFICATION", 75.0)
    
    mat = MockMaterial(340.0)
    matches = recycler_matcher.rank_recyclers(
        recyclers=[r1, r2],
        material=mat,
        weight_kg=20.0,
        collector_lat=19.04,
        collector_lon=72.86
    )
    
    assert len(matches) == 2
    assert matches[0]["recycler_id"] == 1
    assert matches[0]["is_best_match"] is True
    assert any("Verified" in reason for reason in matches[0]["match_reasons"])

def test_trust_score_engine_computation():
    score_high = trust_score_engine.calculate_trust_score(
        authorization_status="VERIFIED",
        transaction_completion_rate=98.0,
        quote_accuracy_rate=95.0,
        dispute_rate=0.5,
        avg_response_time_minutes=10.0
    )
    score_low = trust_score_engine.calculate_trust_score(
        authorization_status="PENDING_VERIFICATION",
        transaction_completion_rate=70.0,
        quote_accuracy_rate=65.0,
        dispute_rate=6.0,
        avg_response_time_minutes=80.0
    )
    assert score_high >= 90.0
    assert score_low < 70.0
