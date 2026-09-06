from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TransactionOut(BaseModel):
    id: int
    transaction_code: str
    lot_id: int
    lot_code: str
    collector_id: int
    collector_name: str
    recycler_id: int
    recycler_name: str
    material_name: str
    final_amount_inr: float
    payment_mode: str
    payment_status: str
    co2_reduction_kg_est: float
    hazardous_waste_diverted_kg: float
    critical_metal_recovered_grams_est: float
    is_anomaly_flagged: bool
    settled_at: datetime

    class Config:
        from_attributes = True

class EarningsLedgerSummary(BaseModel):
    today_collected_inr: float
    today_pending_inr: float
    today_received_inr: float
    monthly_total_earnings_inr: float
    monthly_lots_count: int
    monthly_avg_per_lot_inr: float
    all_time_earnings_inr: float
    all_time_lots_count: int

class EarningsLedgerEntryOut(BaseModel):
    id: int
    lot_id: int
    lot_code: str
    material_name: str
    amount_inr: float
    payment_mode: str
    entry_date: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True
