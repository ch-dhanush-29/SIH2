from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class IngestionErrorRow(BaseModel):
    row_number: int
    part_id: Optional[str] = None
    column: str
    error_type: str  # MISSING_VALUE, NEGATIVE_VALUE, PHYSICAL_IMPOSSIBILITY, DUPLICATE_KEY, INVALID_FORMAT
    message: str

class IngestionValidationReport(BaseModel):
    file_name: str
    total_rows: int
    valid_rows: int
    rejected_rows: int
    status: str  # VALIDATED, REJECTED, PARTIAL_WARNING
    detected_format: str  # WIDE_CHECKPOINTS, LONG_TIMESERIES
    detected_lots: List[str]
    detected_parameters: List[str]
    errors: List[IngestionErrorRow]
    summary_message: str

class IngestionCommitResponse(BaseModel):
    lot_id: str
    components_created: int
    measurements_created: int
    status: str
