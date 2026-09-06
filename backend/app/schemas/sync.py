from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime

class SyncItem(BaseModel):
    local_id: str
    entity_type: str # LOT, HANDOVER, PRICE_OBSERVATION
    idempotency_key: str
    device_id: str
    payload: Dict[str, Any]
    created_at_client: Optional[str] = None

class SyncBatchRequest(BaseModel):
    device_id: str
    items: List[SyncItem]

class SyncItemResult(BaseModel):
    local_id: str
    entity_type: str
    idempotency_key: str
    server_id: Optional[str]
    sync_status: str # SYNCED, CONFLICT, FAILED
    error_message: Optional[str] = None

class SyncBatchResponse(BaseModel):
    device_id: str
    total_processed: int
    synced_count: int
    conflict_count: int
    failed_count: int
    results: List[SyncItemResult]
