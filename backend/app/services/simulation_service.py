import asyncio
import random
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.websocket.manager import event_manager
from backend.websocket.events import EventType

CITIES = [
    {"city": "Hyderabad", "area": "Musheerabad", "state": "Telangana", "lat": 17.4123, "lng": 78.4983},
    {"city": "Mumbai", "area": "Dharavi", "state": "Maharashtra", "lat": 19.0434, "lng": 72.8567},
    {"city": "Delhi", "area": "Seelampur", "state": "Delhi NCR", "lat": 28.6692, "lng": 77.2728},
    {"city": "Bengaluru", "area": "Peenya Industrial Area", "state": "Karnataka", "lat": 13.0285, "lng": 77.5197},
    {"city": "Chennai", "area": "Guindy", "state": "Tamil Nadu", "lat": 13.0067, "lng": 80.2025},
    {"city": "Kolkata", "area": "Chandni Chowk", "state": "West Bengal", "lat": 22.5697, "lng": 88.3582}
]

MATERIALS_POOL = [
    {
        "category": "High-Grade PCB",
        "name": "Telecom Grade Motherboard PCB",
        "base_rate": 680.0,
        "precious_yield": {"gold_g_per_kg": 0.35, "copper_pct": 22.5, "palladium_g_per_kg": 0.04},
        "hazard_note": "Lead solder and brominated flame retardants present. Handled in enclosed shredder."
    },
    {
        "category": "Gold-Finger RAM",
        "name": "DDR3/DDR4 Server Memory Sticks",
        "base_rate": 1850.0,
        "precious_yield": {"gold_g_per_kg": 1.45, "copper_pct": 14.0, "palladium_g_per_kg": 0.12},
        "hazard_note": "Non-hazardous electronic components. High strategic mineral value."
    },
    {
        "category": "Li-Ion Battery",
        "name": "Smartphone Lithium-Cobalt Polymer Batteries",
        "base_rate": 145.0,
        "precious_yield": {"cobalt_pct": 18.0, "lithium_pct": 3.2, "copper_pct": 8.5},
        "hazard_note": "Class 9 Hazmat. Risk of thermal runaway. Fireproof drums required."
    },
    {
        "category": "Pure Copper Cable",
        "name": "Stripped Telecom Communication Cable",
        "base_rate": 520.0,
        "precious_yield": {"copper_pct": 98.2, "gold_g_per_kg": 0.0, "palladium_g_per_kg": 0.0},
        "hazard_note": "PVC casing stripped without open burning (zero toxic dioxin emission)."
    },
    {
        "category": "CRT Glass / Display",
        "name": "Leaded CRT Monitor Glass",
        "base_rate": 45.0,
        "precious_yield": {"lead_recovery_pct": 22.0, "glass_silica_pct": 65.0},
        "hazard_note": "Heavy metal lead hazard. Direct acid washing prohibited by CPCB 2022 rules."
    }
]

COLLECTOR_NAMES = [
    {"name": "Ramesh Kumar", "upi": "ramesh.k@okaxis", "phone": "+91 98490 XXXXX", "rating": 4.9},
    {"name": "Mohd. Aslam", "upi": "aslam.scrap@paytm", "phone": "+91 97110 XXXXX", "rating": 4.8},
    {"name": "Govind S.", "upi": "govind.ewaste@ibl", "phone": "+91 99401 XXXXX", "rating": 4.7},
    {"name": "Pooja Devi", "upi": "poojadevi@oksbi", "phone": "+91 96540 XXXXX", "rating": 5.0},
    {"name": "Anil Rathore", "upi": "anil.scrap@icici", "phone": "+91 98230 XXXXX", "rating": 4.85}
]

RECYCLER_NAMES = [
    {"name": "EcoGreen Authorized Hyd Recyclers", "reg": "CPCB/EPR/2024/TS-089", "trust": 96.5},
    {"name": "Bharat Circular Metals Refineries", "reg": "CPCB/EPR/2023/MH-412", "trust": 98.2},
    {"name": "Seelampur Clean Green Facility", "reg": "CPCB/EPR/2025/DL-104", "trust": 94.8},
    {"name": "GreenTerra Sustainable Metallurgy", "reg": "CPCB/EPR/2024/KA-552", "trust": 97.4}
]

class LiveSimulationEngine:
    def __init__(self):
        self.is_running: bool = False
        self.speed_multiplier: float = 1.0  # 1.0 = normal (every 2.5s step)
        self.current_step_index: int = 0
        self.active_lot_in_progress: Optional[Dict[str, Any]] = None
        self.stats = {
            "total_simulated_lots": 142,
            "total_weight_kg": 4820.5,
            "total_settlement_inr": 1845200.0,
            "active_anomalies": 3,
            "gold_recovered_g": 314.8,
            "copper_recovered_kg": 980.2,
            "co2_avoided_kg": 14350.0
        }
        self.simulation_task: Optional[asyncio.Task] = None

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "speed_multiplier": self.speed_multiplier,
            "active_lot": self.active_lot_in_progress,
            "stats": self.stats,
            "current_step_name": self._get_step_name(self.current_step_index)
        }

    def _get_step_name(self, index: int) -> str:
        names = [
            "1. Material Discovery & Photo Capture",
            "2. Edge AI Classification & Grade Identification",
            "3. Bluetooth Tare Weight Capture",
            "4. Dynamic Fair Price Intelligence Calculation",
            "5. Recycler MCDA Radar Matching",
            "6. QR Digital Passport & SHA-256 Chain Generation",
            "7. Logistics Pickup & Gate Arrival",
            "8. Recycler Dual Weighing & Verification",
            "9. Micro-Escrow Instant Payment Settlement",
            "10. Circular Strategic Minerals Recovery Record"
        ]
        return names[index % len(names)]

    async def start(self):
        if not self.is_running:
            self.is_running = True
            if not self.simulation_task or self.simulation_task.done():
                self.simulation_task = asyncio.create_task(self._simulation_loop())
            await event_manager.broadcast({
                "event": EventType.SYSTEM_ALERT.value,
                "category": "simulation",
                "data": {"status": "started", "speed": self.speed_multiplier},
                "summary": "Live City E-Waste Simulation Engine STARTED",
                "severity": "info"
            })

    async def pause(self):
        self.is_running = False
        await event_manager.broadcast({
            "event": EventType.SYSTEM_ALERT.value,
            "category": "simulation",
            "data": {"status": "paused"},
            "summary": "Live City E-Waste Simulation Engine PAUSED",
            "severity": "warning"
        })

    async def reset(self):
        self.is_running = False
        self.current_step_index = 0
        self.active_lot_in_progress = None
        await event_manager.broadcast({
            "event": EventType.SYSTEM_ALERT.value,
            "category": "simulation",
            "data": {"status": "reset"},
            "summary": "Live Simulation Engine state RESET to baseline",
            "severity": "info"
        })

    def set_speed(self, multiplier: float):
        self.speed_multiplier = max(0.2, min(multiplier, 10.0))

    async def inject_anomaly(self, anomaly_type: str = "WEIGHT_DISCREPANCY") -> Dict[str, Any]:
        lot_id = self.active_lot_in_progress["lot_id"] if self.active_lot_in_progress else f"LOT-2026-{random.randint(1000, 9999)}"
        anomaly_payload = {
            "anomaly_id": f"ANOM-{random.randint(1000, 9999)}",
            "lot_id": lot_id,
            "anomaly_type": anomaly_type,
            "severity": "HIGH",
            "detected_at": datetime.utcnow().isoformat(),
            "details": {
                "claimed_weight_kg": 24.5,
                "scale_measured_kg": 19.2,
                "discrepancy_pct": 21.6,
                "reason": "Weight variation exceeds 15% tolerance limit. Possible tare tamper or moisture loss.",
                "inspector_notes": "Triggered by edge scale telemetry delta check."
            },
            "status": "FLAGGED_FOR_REVIEW"
        }
        self.stats["active_anomalies"] += 1
        await event_manager.broadcast({
            "event": EventType.ANOMALY_DETECTED.value,
            "category": "anomalies",
            "data": anomaly_payload,
            "summary": f"⚠️ ANOMALY DETECTED on {lot_id}: {anomaly_type} (21.6% delta)",
            "severity": "alert"
        })
        return anomaly_payload

    async def step_once(self) -> Dict[str, Any]:
        """Advance exactly one lifecycle step manually."""
        step = self.current_step_index % 10
        event = await self._execute_step(step)
        self.current_step_index += 1
        return event

    async def _simulation_loop(self):
        while self.is_running:
            step = self.current_step_index % 10
            await self._execute_step(step)
            self.current_step_index += 1
            
            # Base sleep duration scaled by speed multiplier
            sleep_sec = max(0.5, 2.5 / self.speed_multiplier)
            await asyncio.sleep(sleep_sec)

    async def _execute_step(self, step: int) -> Dict[str, Any]:
        timestamp = datetime.utcnow().isoformat()
        
        if step == 0 or self.active_lot_in_progress is None:
            # Step 1: Create Lot
            collector = random.choice(COLLECTOR_NAMES)
            location = random.choice(CITIES)
            material = random.choice(MATERIALS_POOL)
            weight = round(random.uniform(12.5, 48.0), 1)
            lot_num = random.randint(1000, 9999)
            lot_id = f"LOT-2026-{location['city'][:3].upper()}-{lot_num}"
            
            self.active_lot_in_progress = {
                "lot_id": lot_id,
                "collector": collector,
                "location": location,
                "material": material,
                "weight_kg": weight,
                "status": "DISCOVERED",
                "created_at": timestamp
            }
            
            payload = {
                "event": EventType.LOT_CREATED.value,
                "category": "collection",
                "timestamp": timestamp,
                "data": {
                    "lot_id": lot_id,
                    "collector_name": collector["name"],
                    "city": f"{location['area']}, {location['city']}",
                    "initial_notes": "Discarded electronic hardware scanned in informal hub"
                },
                "summary": f"📷 New Lot Discovered: {lot_id} in {location['area']}, {location['city']} by {collector['name']}",
                "severity": "info"
            }
            await event_manager.broadcast(payload)
            return payload

        lot = self.active_lot_in_progress

        if step == 1:
            # Step 2: AI Classification
            conf = round(random.uniform(92.4, 98.9), 1)
            lot["ai_confidence"] = conf
            payload = {
                "event": EventType.AI_CLASSIFIED.value,
                "category": "ai",
                "timestamp": timestamp,
                "data": {
                    "lot_id": lot["lot_id"],
                    "material_category": lot["material"]["category"],
                    "detected_grade": lot["material"]["name"],
                    "confidence_score": f"{conf}%",
                    "hazard_assessment": lot["material"]["hazard_note"]
                },
                "summary": f"🤖 AI Vision Identified {lot['material']['name']} ({conf}% confidence)",
                "severity": "info"
            }
            await event_manager.broadcast(payload)
            return payload

        elif step == 2:
            # Step 3: Weight Capture
            lot["scale_device_id"] = f"BLE-SCALE-{random.randint(10, 99)}"
            payload = {
                "event": EventType.WEIGHT_CAPTURED.value,
                "category": "collection",
                "timestamp": timestamp,
                "data": {
                    "lot_id": lot["lot_id"],
                    "certified_weight_kg": lot["weight_kg"],
                    "scale_device": lot["scale_device_id"],
                    "tare_verified": True
                },
                "summary": f"⚖️ Bluetooth Scale Certified Weight: {lot['weight_kg']} kg (Zero Tare OK)",
                "severity": "info"
            }
            await event_manager.broadcast(payload)
            return payload

        elif step == 3:
            # Step 4: Fair Price Calculation
            base_rate = lot["material"]["base_rate"]
            jitter = random.uniform(-5.0, 12.0)
            unit_price = round(base_rate + jitter, 2)
            est_total = round(unit_price * lot["weight_kg"], 2)
            lot["fair_price_per_kg"] = unit_price
            lot["total_estimated_value"] = est_total
            
            payload = {
                "event": EventType.PRICE_CALCULATED.value,
                "category": "pricing",
                "timestamp": timestamp,
                "data": {
                    "lot_id": lot["lot_id"],
                    "fair_price_per_kg": f"₹{unit_price}/kg",
                    "total_fair_value": f"₹{est_total:,.2f}",
                    "mandi_index_delta": "+2.4% vs local scrap dealer"
                },
                "summary": f"₹ Fair Price Engine Calculated ₹{est_total:,.2f} (@ ₹{unit_price}/kg)",
                "severity": "info"
            }
            await event_manager.broadcast(payload)
            return payload

        elif step == 4:
            # Step 5: Recycler Match
            recycler = random.choice(RECYCLER_NAMES)
            lot["matched_recycler"] = recycler
            distance_km = round(random.uniform(2.4, 14.8), 1)
            lot["distance_km"] = distance_km
            
            payload = {
                "event": EventType.RECYCLER_MATCHED.value,
                "category": "matching",
                "timestamp": timestamp,
                "data": {
                    "lot_id": lot["lot_id"],
                    "recycler_name": recycler["name"],
                    "cpcb_reg": recycler["reg"],
                    "distance": f"{distance_km} km",
                    "trust_score": f"{recycler['trust']}/100"
                },
                "summary": f"♻️ Recycler Matched: {recycler['name']} ({distance_km} km away, Trust {recycler['trust']}%)",
                "severity": "info"
            }
            await event_manager.broadcast(payload)
            return payload

        elif step == 5:
            # Step 6: QR Digital Passport & SHA-256
            raw_hash_str = f"{lot['lot_id']}:{lot['collector']['name']}:{lot['weight_kg']}:{timestamp}"
            passport_sha256 = hashlib.sha256(raw_hash_str.encode()).hexdigest()
            lot["sha256_hash"] = passport_sha256
            
            payload = {
                "event": EventType.QR_GENERATED.value,
                "category": "security",
                "timestamp": timestamp,
                "data": {
                    "lot_id": lot["lot_id"],
                    "sha256_hash": passport_sha256,
                    "passport_url": f"/passport/{lot['lot_id']}",
                    "tamper_status": "CRYPTOGRAPHICALLY_SEALED"
                },
                "summary": f"🔐 QR Digital Passport Minted for {lot['lot_id']} (SHA-256: {passport_sha256[:16]}...)",
                "severity": "success"
            }
            await event_manager.broadcast(payload)
            return payload

        elif step == 6:
            # Step 7: Pickup Requested & QR Scanned at arrival
            payload = {
                "event": EventType.QR_SCANNED.value,
                "category": "handover",
                "timestamp": timestamp,
                "data": {
                    "lot_id": lot["lot_id"],
                    "scanned_by": lot["matched_recycler"]["name"],
                    "driver_vehicle": f"TS 09 UA {random.randint(1000, 9999)}",
                    "geofence_verified": True
                },
                "summary": f"📱 Logistics Driver Scanned Passport at Collector Gate ({lot['location']['area']})",
                "severity": "info"
            }
            await event_manager.broadcast(payload)
            return payload

        elif step == 7:
            # Step 8: Handover Dual Verification
            verified_weight = lot["weight_kg"]  # Clean match
            lot["verified_weight"] = verified_weight
            
            payload = {
                "event": EventType.HANDOVER_VERIFIED.value,
                "category": "handover",
                "timestamp": timestamp,
                "data": {
                    "lot_id": lot["lot_id"],
                    "claimed_weight": lot["weight_kg"],
                    "gate_verified_weight": verified_weight,
                    "discrepancy": "0.0 kg (100% Match)",
                    "dual_signatures": "CONFIRMED"
                },
                "summary": f"📦 Handover Cryptographically Verified: {verified_weight} kg confirmed by both parties",
                "severity": "success"
            }
            await event_manager.broadcast(payload)
            return payload

        elif step == 8:
            # Step 9: Settlement
            payout = lot["total_estimated_value"]
            self.stats["total_simulated_lots"] += 1
            self.stats["total_weight_kg"] = round(self.stats["total_weight_kg"] + lot["weight_kg"], 1)
            self.stats["total_settlement_inr"] = round(self.stats["total_settlement_inr"] + payout, 2)
            
            payload = {
                "event": EventType.PAYMENT_COMPLETED.value,
                "category": "settlement",
                "timestamp": timestamp,
                "data": {
                    "lot_id": lot["lot_id"],
                    "recipient_name": lot["collector"]["name"],
                    "upi_id": lot["collector"]["upi"],
                    "amount_inr": f"₹{payout:,.2f}",
                    "txn_ref": f"UPI-2026-{random.randint(100000, 999999)}"
                },
                "summary": f"💸 Micro-Escrow Instant Settlement: ₹{payout:,.2f} disbursed to {lot['collector']['name']}",
                "severity": "success"
            }
            await event_manager.broadcast(payload)
            return payload

        else:
            # Step 10: Circular Mineral Recovery Record
            yields = lot["material"]["precious_yield"]
            gold_g = round(yields.get("gold_g_per_kg", 0.0) * lot["weight_kg"], 3)
            copper_kg = round((yields.get("copper_pct", 0.0) / 100.0) * lot["weight_kg"], 2)
            co2_kg = round(lot["weight_kg"] * 3.12, 1)
            
            self.stats["gold_recovered_g"] = round(self.stats["gold_recovered_g"] + gold_g, 2)
            self.stats["copper_recovered_kg"] = round(self.stats["copper_recovered_kg"] + copper_kg, 1)
            self.stats["co2_avoided_kg"] = round(self.stats["co2_avoided_kg"] + co2_kg, 1)
            
            payload = {
                "event": EventType.LOT_UPDATED.value,
                "category": "circular_impact",
                "timestamp": timestamp,
                "data": {
                    "lot_id": lot["lot_id"],
                    "gold_recovered_g": f"{gold_g} g",
                    "copper_recovered_kg": f"{copper_kg} kg",
                    "co2_avoided_kg": f"{co2_kg} kg",
                    "epr_certificate_issued": f"EPR-MINES-{random.randint(10000, 99999)}"
                },
                "summary": f"🌱 Circular Recovery Recorded: {gold_g}g Au, {copper_kg}kg Cu recovered, {co2_kg}kg CO2 avoided",
                "severity": "success"
            }
            # Reset active lot for next loop cycle
            self.active_lot_in_progress = None
            await event_manager.broadcast(payload)
            return payload

# Global singleton simulation engine
simulation_engine = LiveSimulationEngine()
