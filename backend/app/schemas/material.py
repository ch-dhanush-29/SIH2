from pydantic import BaseModel
from typing import Optional, List

class SafetyGuideOut(BaseModel):
    id: int
    title_en: str
    title_hi: str
    title_mr: str
    dos_en: str
    dos_hi: str
    dos_mr: str
    donts_en: str
    donts_hi: str
    donts_mr: str
    icon_name: str
    audio_sample_text_hi: Optional[str] = None
    audio_sample_text_mr: Optional[str] = None

    class Config:
        from_attributes = True

class MaterialCategoryOut(BaseModel):
    id: int
    code: str
    name_en: str
    name_hi: str
    name_mr: str
    icon_emoji: str
    description: Optional[str] = None
    hazard_level: str
    safety_guides: List[SafetyGuideOut] = []

    class Config:
        from_attributes = True

class ValueRecoveryLensOut(BaseModel):
    material_name: str
    critical_minerals_description: Optional[str]
    copper_content_pct_range: str
    gold_content_ppm_range: str
    silver_content_ppm_range: str
    palladium_content_ppm_range: str
    rare_earths_present: str
    hazard_warning: str
    why_formal_recycling_matters: str

class MaterialOut(BaseModel):
    id: int
    category_id: int
    code: str
    name_en: str
    name_hi: str
    name_mr: str
    unit: str
    typical_weight_kg_per_unit: Optional[float] = None
    base_benchmark_price: float
    min_market_price: float
    max_market_price: float
    hazard_warning_en: Optional[str] = None
    hazard_warning_hi: Optional[str] = None
    hazard_warning_mr: Optional[str] = None
    copper_content_pct_range: Optional[str] = None
    gold_content_ppm_range: Optional[str] = None
    silver_content_ppm_range: Optional[str] = None
    rare_earths_present: Optional[str] = None

    class Config:
        from_attributes = True
