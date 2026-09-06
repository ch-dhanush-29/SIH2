from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class MaterialCategory(Base):
    __tablename__ = "material_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False) # e.g. PCB, CABLE, BATTERY, CRT, LCD
    name_en = Column(String(100), nullable=False)
    name_hi = Column(String(100), nullable=False)
    name_mr = Column(String(100), nullable=False)
    icon_emoji = Column(String(20), default="📦")
    description = Column(Text, nullable=True)
    hazard_level = Column(String(20), default="LOW") # LOW, MEDIUM, HIGH, CRITICAL
    created_at = Column(DateTime, default=datetime.utcnow)

    materials = relationship("Material", back_populates="category")
    safety_guides = relationship("SafetyGuide", back_populates="category")

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("material_categories.id"), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False) # e.g. PCB_HIGH_GRADE, PCB_MOTHERBOARD, LI_ION_BATTERY
    name_en = Column(String(120), nullable=False)
    name_hi = Column(String(120), nullable=False)
    name_mr = Column(String(120), nullable=False)
    unit = Column(String(20), default="kg") # kg, piece
    typical_weight_kg_per_unit = Column(Float, nullable=True)
    
    # Baseline benchmark rates per unit (INR)
    base_benchmark_price = Column(Float, nullable=False)
    min_market_price = Column(Float, nullable=False)
    max_market_price = Column(Float, nullable=False)
    
    # Critical Minerals & Value Recovery Profile
    critical_minerals_description = Column(Text, nullable=True)
    copper_content_pct_range = Column(String(50), default="10-25%")
    gold_content_ppm_range = Column(String(50), default="50-250 ppm")
    silver_content_ppm_range = Column(String(50), default="200-800 ppm")
    palladium_content_ppm_range = Column(String(50), default="10-50 ppm")
    rare_earths_present = Column(String(100), default="Neodymium, Gallium, Indium")
    
    hazard_warning_en = Column(Text, nullable=True)
    hazard_warning_hi = Column(Text, nullable=True)
    hazard_warning_mr = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("MaterialCategory", back_populates="materials")
    lots = relationship("Lot", back_populates="material")
    price_observations = relationship("PriceObservation", back_populates="material")

class SafetyGuide(Base):
    __tablename__ = "safety_guides"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("material_categories.id"), nullable=False)
    title_en = Column(String(150), nullable=False)
    title_hi = Column(String(150), nullable=False)
    title_mr = Column(String(150), nullable=False)
    
    dos_en = Column(Text, nullable=False)
    dos_hi = Column(Text, nullable=False)
    dos_mr = Column(Text, nullable=False)
    
    donts_en = Column(Text, nullable=False)
    donts_hi = Column(Text, nullable=False)
    donts_mr = Column(Text, nullable=False)
    
    icon_name = Column(String(50), default="shield")
    audio_sample_text_hi = Column(Text, nullable=True)
    audio_sample_text_mr = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("MaterialCategory", back_populates="safety_guides")
