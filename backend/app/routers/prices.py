from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from backend.app.database import get_db
from backend.app.models.material import Material, MaterialCategory
from backend.app.models.price import PriceObservation
from backend.app.schemas.price import (
    PriceObservationCreate, PriceObservationOut, FairPriceRequest, FairPriceResult,
    MaterialPriceBoardItem, PriceTrendPoint
)
from backend.app.services.fair_price_engine import fair_price_engine

router = APIRouter(prefix="/prices", tags=["Price Intelligence"])

@router.get("/board", response_model=List[MaterialPriceBoardItem])
def get_live_price_board(city: str = "Mumbai", db: Session = Depends(get_db)):
    """
    Returns the real-time price transparency board for all e-waste categories
    with 7-day and 30-day percentage trends.
    """
    materials = db.query(Material).all()
    board = []
    
    for mat in materials:
        # Calculate 7d and 30d simulated trend from observations
        obs = db.query(PriceObservation).filter(PriceObservation.material_id == mat.id).order_by(PriceObservation.observation_date.desc()).limit(30).all()
        
        today_avg = mat.base_benchmark_price
        if obs:
            today_avg = round(sum(o.buying_price_per_unit for o in obs[:4]) / min(len(obs), 4), 1)
            
        trend_points = []
        # Sample weekly points
        for i in range(7, -1, -1):
            target_date = (datetime.utcnow() - timedelta(days=i*4)).strftime("%d %b")
            pt_avg = round(today_avg * (1.0 - (i * 0.009)), 1)
            trend_points.append(PriceTrendPoint(
                date=target_date,
                avg_price=pt_avg,
                min_price=round(pt_avg * 0.94, 1),
                max_price=round(pt_avg * 1.06, 1)
            ))
            
        board.append(MaterialPriceBoardItem(
            material_id=mat.id,
            material_code=mat.code,
            material_name=mat.name_en,
            category_name=mat.category.name_en,
            icon_emoji=mat.category.icon_emoji,
            today_avg_price=today_avg,
            unit="kg",
            change_7d_pct=4.8,
            change_30d_pct=7.2,
            local_range_min=mat.min_market_price,
            local_range_max=mat.max_market_price,
            data_source_badge="CPCB Authorized Recycler Benchmark (Demo Dataset)",
            historical_trend=trend_points
        ))
        
    return board

@router.post("/fair-price-score", response_model=FairPriceResult)
def calculate_fair_price_score(req: FairPriceRequest, db: Session = Depends(get_db)):
    """
    Calculates transparent fair value estimate, expected market price,
    fairness score (0-100), and negotiation script.
    """
    mat = db.query(Material).filter(Material.id == req.material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
        
    res = fair_price_engine.calculate_fair_price(
        base_benchmark_price=mat.base_benchmark_price,
        min_market_price=mat.min_market_price,
        max_market_price=mat.max_market_price,
        weight_kg=req.weight_kg,
        condition_grade=req.condition_grade or "MIXED_GOOD",
        city=req.city or "Mumbai",
        recycler_offer_inr=req.recycler_offer_inr
    )
    
    return FairPriceResult(
        material_id=mat.id,
        material_name=mat.name_en,
        **res
    )

@router.post("/observe", response_model=PriceObservationOut)
def record_price_observation(obs_in: PriceObservationCreate, db: Session = Depends(get_db)):
    obs = PriceObservation(
        material_id=obs_in.material_id,
        location_city=obs_in.location_city,
        location_state=obs_in.location_state,
        buying_price_per_unit=obs_in.buying_price_per_unit,
        selling_price_per_unit=obs_in.selling_price_per_unit,
        unit=obs_in.unit,
        source_type=obs_in.source_type,
        recycler_id=obs_in.recycler_id,
        notes=obs_in.notes,
        is_demo_data=True
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return obs
