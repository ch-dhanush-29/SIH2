import pytest
from backend.app.services.ingestion import IngestionService

def test_ingestion_valid_csv():
    csv_data = """part_id,lot_id,param,row,col,v_0h,v_24h,v_96h,v_168h
CHIP-001,LOT-A,iddq,0,0,10.2,10.4,10.8,11.2
CHIP-002,LOT-A,iddq,0,1,10.1,11.5,15.2,22.1
"""
    report, records = IngestionService.validate_csv(csv_data, "test.csv")
    assert report.status == "VALIDATED"
    assert report.valid_rows == 2
    assert report.rejected_rows == 0
    assert len(records) == 2
    assert records[0]["part_id"] == "CHIP-001"

def test_ingestion_negative_value_rejection():
    csv_data = """part_id,lot_id,param,row,col,v_0h,v_24h
CHIP-001,LOT-A,iddq,0,0,-5.2,10.4
"""
    report, records = IngestionService.validate_csv(csv_data, "bad.csv")
    assert report.status == "REJECTED"
    assert report.rejected_rows == 1
    assert any(e.error_type == "NEGATIVE_VALUE" for e in report.errors)

def test_ingestion_duplicate_key_rejection():
    csv_data = """part_id,lot_id,param,row,col,v_0h,v_24h
CHIP-DUP,LOT-A,iddq,0,0,10.2,10.4
CHIP-DUP,LOT-A,iddq,0,1,10.3,10.5
"""
    report, records = IngestionService.validate_csv(csv_data, "dup.csv")
    assert report.rejected_rows == 1
    assert any(e.error_type == "DUPLICATE_KEY" for e in report.errors)
