import io
import pandas as pd
from typing import Dict, List, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.schemas.ingestion import IngestionValidationReport, IngestionErrorRow
from backend.app.models.lot import Lot
from backend.app.models.component import Component
from backend.app.models.measurement import Measurement

class IngestionService:
    """
    Ingestion & Data Quality Service for Semiconductor Burn-In Datasets.
    Validates CSV/Excel files against domain physics constraints and returns rich error telemetry.
    """

    @staticmethod
    def validate_csv(content: str, filename: str = "upload.csv") -> Tuple[IngestionValidationReport, List[Dict[str, Any]]]:
        """
        Parses and validates CSV content line by line.
        """
        errors: List[IngestionErrorRow] = []
        valid_records: List[Dict[str, Any]] = []

        try:
            df = pd.read_csv(io.StringIO(content))
        except Exception as e:
            return IngestionValidationReport(
                file_name=filename,
                total_rows=0,
                valid_rows=0,
                rejected_rows=0,
                status="REJECTED",
                detected_format="UNKNOWN",
                detected_lots=[],
                detected_parameters=[],
                errors=[IngestionErrorRow(row_number=1, column="FILE", error_type="INVALID_FORMAT", message=f"CSV parse error: {str(e)}")],
                summary_message="Failed to parse CSV file."
            ), []

        # Standardize column names
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Check required columns
        req_cols = {"part_id", "lot_id"}
        missing_req = req_cols - set(df.columns)
        if missing_req:
            return IngestionValidationReport(
                file_name=filename,
                total_rows=len(df),
                valid_rows=0,
                rejected_rows=len(df),
                status="REJECTED",
                detected_format="UNKNOWN",
                detected_lots=[],
                detected_parameters=[],
                errors=[IngestionErrorRow(row_number=1, column="HEADER", error_type="MISSING_VALUE", message=f"Missing required columns: {list(missing_req)}")],
                summary_message=f"Missing required columns: {list(missing_req)}"
            ), []

        detected_lots = sorted(list(df["lot_id"].astype(str).unique()))
        detected_params = sorted(list(df["param"].astype(str).unique())) if "param" in df.columns else ["iddq"]

        seen_parts = set()

        for idx, row in df.iterrows():
            row_num = idx + 2 # 1-based + header
            part_id = str(row.get("part_id", "")).strip()
            lot_id = str(row.get("lot_id", "")).strip()

            if not part_id or part_id.lower() == "nan":
                errors.append(IngestionErrorRow(row_number=row_num, part_id=None, column="part_id", error_type="MISSING_VALUE", message="Empty part_id."))
                continue

            part_key = f"{lot_id}_{part_id}"
            if part_key in seen_parts:
                errors.append(IngestionErrorRow(row_number=row_num, part_id=part_id, column="part_id", error_type="DUPLICATE_KEY", message=f"Duplicate part_id '{part_id}' in lot '{lot_id}'."))
                continue
            seen_parts.add(part_key)

            # Check measurement values
            param = str(row.get("param", "iddq")).strip()
            v_0h_raw = row.get("v_0h", None)
            v_24h_raw = row.get("v_24h", None)

            if pd.isna(v_0h_raw) or pd.isna(v_24h_raw):
                errors.append(IngestionErrorRow(row_number=row_num, part_id=part_id, column="v_0h/v_24h", error_type="MISSING_VALUE", message="Checkpoint values v_0h and v_24h are required."))
                continue

            try:
                v_0h = float(v_0h_raw)
                v_24h = float(v_24h_raw)
                v_96h = float(row.get("v_96h")) if not pd.isna(row.get("v_96h", None)) else None
                v_168h = float(row.get("v_168h")) if not pd.isna(row.get("v_168h", None)) else None
            except ValueError:
                errors.append(IngestionErrorRow(row_number=row_num, part_id=part_id, column="values", error_type="INVALID_FORMAT", message="Measurement value is not a valid float."))
                continue

            # Physics constraints (current / delay must be >= 0)
            if v_0h < 0 or v_24h < 0 or (v_96h is not None and v_96h < 0) or (v_168h is not None and v_168h < 0):
                errors.append(IngestionErrorRow(row_number=row_num, part_id=part_id, column="values", error_type="NEGATIVE_VALUE", message="Parametric values must be non-negative."))
                continue

            # Instrument saturation check (> 1,000,000 is physically anomalous)
            if v_0h > 1e6 or v_24h > 1e6:
                errors.append(IngestionErrorRow(row_number=row_num, part_id=part_id, column="values", error_type="PHYSICAL_IMPOSSIBILITY", message="Unrealistic value exceeding 1,000,000."))
                continue

            # Extract optional ground truth labels
            gt = str(row.get("ground_truth", "NORMAL")).strip()
            is_defect_raw = row.get("is_defect", None)
            if not pd.isna(is_defect_raw):
                is_defect = bool(is_defect_raw)
            else:
                is_defect = gt in ["HARD_FAIL", "LATENT_DRIFT"]

            valid_records.append({
                "part_id": part_id,
                "lot_id": lot_id,
                "param": param,
                "v_0h": v_0h,
                "v_24h": v_24h,
                "v_96h": v_96h,
                "v_168h": v_168h,
                "row": int(row.get("row", 0)) if "row" in row and not pd.isna(row.get("row")) else 0,
                "col": int(row.get("col", 0)) if "col" in row and not pd.isna(row.get("col")) else 0,
                "ground_truth": gt,
                "is_defect": is_defect
            })

        total_rows = len(df)
        valid_count = len(valid_records)
        rejected_count = len(errors)

        if rejected_count == 0:
            status = "VALIDATED"
            msg = f"Successfully validated all {valid_count} component records across {len(detected_lots)} lots."
        elif valid_count > 0:
            status = "PARTIAL_WARNING"
            msg = f"Validated {valid_count} rows, {rejected_count} rows rejected due to quality checks."
        else:
            status = "REJECTED"
            msg = f"All {rejected_count} rows were rejected due to data validation failures."

        report = IngestionValidationReport(
            file_name=filename,
            total_rows=total_rows,
            valid_rows=valid_count,
            rejected_rows=rejected_count,
            status=status,
            detected_format="WIDE_CHECKPOINTS",
            detected_lots=detected_lots,
            detected_parameters=detected_params,
            errors=errors[:100], # Top 100 errors
            summary_message=msg
        )
        return report, valid_records

    @staticmethod
    def commit_records(records: List[Dict[str, Any]], db: Session) -> Dict[str, Any]:
        """
        Commits validated records to the database.
        """
        created_components = 0
        created_measurements = 0
        lots_seen = set()

        for rec in records:
            lot_id = rec["lot_id"]
            if lot_id not in lots_seen:
                lots_seen.add(lot_id)
                existing_lot = db.query(Lot).filter(Lot.lot_id == lot_id).first()
                if not existing_lot:
                    new_lot = Lot(
                        lot_id=lot_id,
                        part_family="RH-FPGA-500K",
                        total_parts=0,
                        screened_parts=0
                    )
                    db.add(new_lot)
                    db.flush()

            # Find or create component
            comp = db.query(Component).filter(Component.part_id == rec["part_id"]).first()
            if not comp:
                comp = Component(
                    part_id=rec["part_id"],
                    lot_id=rec["lot_id"],
                    row=rec.get("row", 0),
                    col=rec.get("col", 0),
                    status="PASS",
                    is_ground_truth_defect=rec.get("is_defect", False),
                    defect_type=rec.get("ground_truth", "NORMAL")
                )
                db.add(comp)
                db.flush()
                created_components += 1
            else:
                comp.is_ground_truth_defect = rec.get("is_defect", False)
                comp.defect_type = rec.get("ground_truth", "NORMAL")

            # Create or update measurement
            meas = db.query(Measurement).filter(
                Measurement.component_id == comp.id,
                Measurement.parameter == rec["param"]
            ).first()

            if not meas:
                meas = Measurement(
                    component_id=comp.id,
                    parameter=rec["param"],
                    v_0h=rec["v_0h"],
                    v_24h=rec["v_24h"],
                    v_96h=rec.get("v_96h"),
                    v_168h=rec.get("v_168h")
                )
                db.add(meas)
                created_measurements += 1
            else:
                meas.v_0h = rec["v_0h"]
                meas.v_24h = rec["v_24h"]
                meas.v_96h = rec.get("v_96h")
                meas.v_168h = rec.get("v_168h")

        db.commit()
        return {
            "created_components": created_components,
            "created_measurements": created_measurements,
            "lots_affected": list(lots_seen)
        }
