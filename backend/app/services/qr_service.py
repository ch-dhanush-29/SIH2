import qrcode
import io
import base64
import hashlib
import json
from typing import Dict, Any

class QRService:
    """
    Standard QR Code generation and cryptographic SHA-256 lot passport hashing.
    Generates verifiable Base64 QR codes readable by standard mobile cameras / scanners.
    """

    def generate_qr_base64(self, payload_data: str) -> str:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=2,
        )
        qr.add_data(payload_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"

    def generate_lot_hash(self, lot_dict: Dict[str, Any]) -> str:
        """
        Creates a verifiable cryptographic SHA-256 fingerprint for the lot passport.
        """
        sorted_payload = json.dumps(lot_dict, sort_keys=True, default=str)
        return hashlib.sha256(sorted_payload.encode("utf-8")).hexdigest()

    def generate_handover_hash(self, handover_dict: Dict[str, Any]) -> str:
        """
        Creates an immutable SHA-256 hash receipt for the handover transaction.
        """
        sorted_payload = json.dumps(handover_dict, sort_keys=True, default=str)
        return hashlib.sha256(sorted_payload.encode("utf-8")).hexdigest()

qr_service = QRService()
