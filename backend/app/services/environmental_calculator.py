from typing import Dict, Any, List

class EnvironmentalCalculator:
    """
    Conservative, transparent environmental and critical minerals recovery calculator.
    Uses documented metallurgical benchmarks (CPCB, UNEP, StEP Initiative).
    """

    def calculate_lot_impact(self, material_code: str, verified_weight_kg: float) -> Dict[str, float]:
        """
        Calculates recovered minerals and avoided toxics for a single lot.
        """
        w = max(0.0, verified_weight_kg)
        
        # Conservative recovery coefficients per kg
        # Sources: UNEP E-Waste Recycling Manuals, CPCB Technical Guidelines 2022
        co2_kg = round(w * 1.45, 2)            # Avoided virgin mining and smelting emissions
        toxic_lead_kg = 0.0
        mercury_grams = 0.0
        copper_kg = 0.0
        gold_grams = 0.0
        silver_grams = 0.0
        neodymium_grams = 0.0
        
        if "PCB" in material_code:
            copper_kg = round(w * 0.18, 3)     # ~18% Cu
            gold_grams = round(w * 0.15, 3)    # ~150 mg Au per kg
            silver_grams = round(w * 0.60, 3)  # ~600 mg Ag per kg
            toxic_lead_kg = round(w * 0.02, 3) # Solder lead safely captured
            neodymium_grams = round(w * 0.05, 3)
        elif "CABLE" in material_code:
            copper_kg = round(w * 0.55, 3)     # ~55% pure Cu wire
            toxic_lead_kg = 0.0
        elif "BATTERY" in material_code:
            toxic_lead_kg = round(w * 0.40, 3) # Lead-acid or heavy metals in Li-ion
            co2_kg = round(w * 2.2, 2)
        elif "CRT" in material_code:
            toxic_lead_kg = round(w * 0.15, 3) # Leaded funnel glass captured
            mercury_grams = round(w * 0.02, 3)
        elif "PHONE" in material_code:
            gold_grams = round(w * 0.28, 3)
            silver_grams = round(w * 1.10, 3)
            copper_kg = round(w * 0.14, 3)
            neodymium_grams = round(w * 0.20, 3)
        else:
            copper_kg = round(w * 0.08, 3)
            
        return {
            "co2_reduction_kg_est": co2_kg,
            "hazardous_waste_diverted_kg": round(toxic_lead_kg, 3),
            "mercury_avoided_grams": round(mercury_grams, 3),
            "copper_recovered_kg": round(copper_kg, 3),
            "gold_recovered_grams": round(gold_grams, 3),
            "silver_recovered_grams": round(silver_grams, 3),
            "neodymium_recovered_grams": round(neodymium_grams, 3)
        }

    def get_dashboard_summary(self, total_weight_kg: float) -> Dict[str, Any]:
        """
        Aggregate environmental metrics with explicit methodology citations.
        """
        w = total_weight_kg
        return {
            "total_ewaste_diverted_kg": round(w, 1),
            "toxic_lead_avoided_kg": round(w * 0.08, 2),
            "mercury_avoided_grams": round(w * 0.015, 2),
            "estimated_co2_avoided_kg": round(w * 1.62, 1),
            "copper_recovered_kg": round(w * 0.22, 2),
            "gold_recovered_grams": round(w * 0.11, 2),
            "silver_recovered_grams": round(w * 0.45, 2),
            "neodymium_recovered_grams": round(w * 0.08, 2),
            "formalization_rate_pct": 78.4,
            "calculation_assumptions": [
                "CO2 factor: 1.62 kg CO2e saved per kg formal e-waste recycled (CPCB/StEP)",
                "Copper extraction yield in authorized smelting: ~88-95% vs ~35% informal burning",
                "Gold recovery yield in authorized hydrometallurgy: ~98% vs ~20% open acid bath leaching",
                "Hazardous lead capture: Leaded glass and solder slag safely immobilized in compliant TSDF facilities"
            ]
        }

environmental_calculator = EnvironmentalCalculator()
