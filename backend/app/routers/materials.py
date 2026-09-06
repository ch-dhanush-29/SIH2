from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models.material import MaterialCategory, Material, SafetyGuide
from backend.app.schemas.material import MaterialCategoryOut, MaterialOut, SafetyGuideOut, ValueRecoveryLensOut

router = APIRouter(prefix="/materials", tags=["Materials & Safety"])

@router.get("/categories", response_model=List[MaterialCategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(MaterialCategory).all()

@router.get("", response_model=List[MaterialOut])
def get_materials(category_code: str = None, db: Session = Depends(get_db)):
    q = db.query(Material)
    if category_code:
        q = q.join(MaterialCategory).filter(MaterialCategory.code == category_code.upper())
    return q.all()

@router.get("/safety-guides", response_model=List[SafetyGuideOut])
def get_safety_guides(db: Session = Depends(get_db)):
    return db.query(SafetyGuide).all()

@router.get("/{material_id}/value-recovery-lens", response_model=ValueRecoveryLensOut)
def get_value_recovery_lens(material_id: int, db: Session = Depends(get_db)):
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
        
    return ValueRecoveryLensOut(
        material_name=mat.name_en,
        critical_minerals_description=mat.critical_minerals_description or f"Contains high-value strategic metals essential for India's domestic supply chain.",
        copper_content_pct_range=mat.copper_content_pct_range or "10-25%",
        gold_content_ppm_range=mat.gold_content_ppm_range or "50-250 ppm",
        silver_content_ppm_range=mat.silver_content_ppm_range or "200-800 ppm",
        palladium_content_ppm_range=mat.palladium_content_ppm_range or "10-50 ppm",
        rare_earths_present=mat.rare_earths_present or "Neodymium, Gallium, Indium",
        hazard_warning=mat.hazard_warning_en or "High risk if burned or acid-leached in informal setups.",
        why_formal_recycling_matters="Formal hydrometallurgical processing achieves up to 98% metal purity with zero toxic open-air emissions, while informal acid-leaching loses >60% of critical rare earths and causes severe toxic groundwater poisoning."
    )
