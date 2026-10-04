import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.ingestion import IngestionValidationReport, IngestionCommitResponse
from backend.app.services.ingestion import IngestionService
from backend.app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/datasets", tags=["Dataset Ingestion & Validation"])

CSV_TEMPLATE = """part_id,lot_id,param,row,col,v_0h,v_24h,v_96h,v_168h
CHIP-EX-001,LOT-TEST-01,iddq,0,0,10.2,10.4,10.8,11.2
CHIP-EX-002,LOT-TEST-01,iddq,0,1,10.1,11.8,16.5,24.2
"""

@router.get("/template", response_class=PlainTextResponse)
def get_csv_template():
    return PlainTextResponse(CSV_TEMPLATE, media_type="text/csv")

@router.post("/validate", response_model=IngestionValidationReport)
async def validate_dataset(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin-1")

    report, _ = IngestionService.validate_csv(content_str, filename=file.filename or "upload.csv")
    return report

@router.post("/upload", response_model=IngestionCommitResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["ADMIN", "ENGINEER"]))
):
    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin-1")

    report, valid_records = IngestionService.validate_csv(content_str, filename=file.filename or "upload.csv")
    if not valid_records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Upload rejected. {len(report.errors)} errors encountered: {report.summary_message}"
        )

    commit_res = IngestionService.commit_records(valid_records, db)
    return IngestionCommitResponse(
        lot_id=",".join(commit_res["lots_affected"]),
        components_created=commit_res["created_components"],
        measurements_created=commit_res["created_measurements"],
        status="COMMITTED"
    )

@router.get("/golden")
def get_golden_summary():
    golden_path = "data/golden_dataset_1000.csv"
    if not os.path.exists(golden_path):
        raise HTTPException(status_code=404, detail="Golden dataset not yet generated.")
    return {
        "dataset_name": "ISRO SIH26170 Golden 1000-Component Benchmark",
        "lots": 10,
        "parts": 1000,
        "star_component": "CHIP-LOT04-042",
        "star_lot": "LOT-2026-04",
        "star_description": "Passes static 50µA limit at 0h/24h/96h/168h (28.5µA peak), but caught as early reject at 24h by drift safety slope."
    }
