from typing import Dict, Any

class UnitEconomicsService:
    """
    Transparent Collector Unit Economics Modeler.
    Compares real-world informal scrap aggregation costs vs. formal E-Waste Saathi routes.
    """

    def calculate_economics(
        self,
        daily_collection_kg: float = 25.0,
        informal_middleman_rate_per_kg: float = 85.0,
        formal_recycler_rate_per_kg: float = 120.0,
        collector_transport_cost_informal: float = 150.0,
        collector_transport_cost_formal: float = 0.0,
        informal_loss_sorting_pct: float = 12.0,
        formal_loss_pct: float = 0.0
    ) -> Dict[str, Any]:
        
        # Informal Route Math
        effective_informal_weight = daily_collection_kg * (1.0 - (informal_loss_sorting_pct / 100.0))
        informal_gross = effective_informal_weight * informal_middleman_rate_per_kg
        informal_net = max(0.0, informal_gross - collector_transport_cost_informal)
        
        # Formal Platform Route Math
        effective_formal_weight = daily_collection_kg * (1.0 - (formal_loss_pct / 100.0))
        formal_gross = effective_formal_weight * formal_recycler_rate_per_kg
        formal_net = max(0.0, formal_gross - collector_transport_cost_formal)
        
        daily_gain = formal_net - informal_net
        monthly_gain = daily_gain * 26.0 # 26 working days in a month
        pct_increase = ((formal_net - informal_net) / (informal_net + 1e-5)) * 100.0
        
        return {
            "daily_informal_gross_inr": round(informal_gross, 2),
            "daily_informal_net_earnings_inr": round(informal_net, 2),
            "daily_formal_gross_inr": round(formal_gross, 2),
            "daily_formal_net_earnings_inr": round(formal_net, 2),
            "net_daily_gain_inr": round(daily_gain, 2),
            "net_monthly_gain_inr": round(monthly_gain, 2),
            "percentage_income_increase": round(pct_increase, 1),
            "status_label": f"+{round(pct_increase, 1)}% higher net earnings with formal Saathi platform",
            "breakdown_notes": [
                f"Informal route suffers from ~{informal_loss_sorting_pct}% sorting/rejection markdown and ₹{collector_transport_cost_informal} self-transport cost.",
                "Formal Saathi route provides verified electronic weighing, direct recycler price, and free aggregated doorstep pickup."
            ]
        }

unit_economics_service = UnitEconomicsService()
