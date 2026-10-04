import os
import json
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.core.security import get_password_hash
from backend.app.models.user import User
from backend.app.models.lot import Lot
from backend.app.models.component import Component
from backend.app.models.measurement import Measurement
from backend.app.models.audit import ModelVersion, AuditLog
from backend.app.services.ingestion import IngestionService

def init_and_seed_db():
    """
    Creates all database tables and seeds initial users, models, and golden dataset if empty.
    """
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Seed RBAC Users
        if db.query(User).count() == 0:
            print("Seeding initial RBAC users...")
            users = [
                User(
                    username="admin",
                    email="admin@isro.gov.in",
                    hashed_password=get_password_hash("isro_admin_2026"),
                    full_name="Mission Reliability Director",
                    role="ADMIN"
                ),
                User(
                    username="qa_inspector",
                    email="qa.screening@isro.gov.in",
                    hashed_password=get_password_hash("isro_qa_2026"),
                    full_name="Senior QA Lead Inspector",
                    role="QA_INSPECTOR"
                ),
                User(
                    username="engineer",
                    email="eng.reliability@isro.gov.in",
                    hashed_password=get_password_hash("isro_eng_2026"),
                    full_name="Burn-In Screening Test Engineer",
                    role="ENGINEER"
                ),
                User(
                    username="viewer",
                    email="viewer@isro.gov.in",
                    hashed_password=get_password_hash("isro_view_2026"),
                    full_name="Quality Auditor / Stakeholder",
                    role="VIEWER"
                )
            ]
            db.add_all(users)
            db.commit()

        # 2. Seed Model Versions
        if db.query(ModelVersion).count() == 0:
            print("Seeding production screening model versions...")
            models = [
                ModelVersion(
                    version_tag="v1.4.2-isro-ensemble",
                    model_family="ROBUST_ENSEMBLE",
                    description="Multi-layer dynamic outlier + drift predictor ensemble with zero FN flight bias",
                    hyperparameters_json=json.dumps({"weights": [0.35, 0.20, 0.25, 0.20], "k_sigma_default": 2.8, "contamination": 0.08}),
                    metrics_json=json.dumps({"recall": 1.00, "precision": 0.94, "f2_score": 0.988, "mae_168h": 0.42, "cost_score": 12.5}),
                    is_active=True
                ),
                ModelVersion(
                    version_tag="v1.3.0-gradient-drift",
                    model_family="DRIFT_GBR",
                    description="Log-linear gradient drift trajectory forecaster for 168h burn-in prediction",
                    hyperparameters_json=json.dumps({"learning_rate": 0.05, "n_estimators": 150, "max_depth": 4}),
                    metrics_json=json.dumps({"recall": 0.98, "precision": 0.91, "mae_168h": 0.38}),
                    is_active=False
                )
            ]
            db.add_all(models)
            db.commit()

        # 3. Seed Golden Dataset
        golden_csv_path = "data/golden_dataset_1000.csv"
        if os.path.exists(golden_csv_path) and db.query(Component).count() == 0:
            print(f"Loading golden dataset from {golden_csv_path}...")
            with open(golden_csv_path, "r", encoding="utf-8") as f:
                content = f.read()
            report, records = IngestionService.validate_csv(content, "golden_dataset_1000.csv")
            if records:
                IngestionService.commit_records(records, db)
                print(f"Successfully loaded {len(records)} golden records into database.")

    finally:
        db.close()

if __name__ == "__main__":
    init_and_seed_db()
