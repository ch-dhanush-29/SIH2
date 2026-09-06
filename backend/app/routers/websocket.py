import asyncio
import json
import random
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime

router = APIRouter(tags=["Realtime WebSocket Streaming"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@router.websocket("/ws/live-stream")
async def websocket_live_stream(websocket: WebSocket):
    """
    Real-time bidirectional WebSocket stream pushing live price board ticks,
    incoming lot broadcasts, instant scale handover notifications, and anomaly alerts.
    """
    await manager.connect(websocket)
    try:
        # Send welcome state
        await websocket.send_json({
            "event_type": "CONNECTED",
            "message": "Connected to E-Waste Saathi Realtime Intelligence Feed",
            "timestamp": datetime.utcnow().isoformat()
        })

        # Periodic simulated live market updates if idle
        while True:
            # Listen for client messages or stream ticker events
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=4.0)
                msg = json.loads(data)
                # Echo / broadcast custom client event
                if msg.get("action") == "PING":
                    await websocket.send_json({"event_type": "PONG", "timestamp": datetime.utcnow().isoformat()})
            except asyncio.TimeoutError:
                # Emit realistic market stream ticks
                event_types = ["PRICE_TICK", "NEW_LOT_BROADCAST", "HANDOVER_VERIFIED", "MINERAL_RECOVERED"]
                chosen_event = random.choice(event_types)
                
                if chosen_event == "PRICE_TICK":
                    materials = [
                        {"name": "Server High-Grade PCB", "price": round(680.0 + random.uniform(-4, 6), 1), "change": "+1.2%"},
                        {"name": "Pure Copper Cable", "price": round(520.0 + random.uniform(-3, 5), 1), "change": "+0.8%"},
                        {"name": "Gold Finger RAM Sticks", "price": round(1850.0 + random.uniform(-10, 15), 1), "change": "+2.4%"},
                        {"name": "Lithium-Ion Phone Batteries", "price": round(145.0 + random.uniform(-2, 3), 1), "change": "+0.5%"}
                    ]
                    payload = {
                        "event_type": "PRICE_TICK",
                        "data": random.choice(materials),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                elif chosen_event == "NEW_LOT_BROADCAST":
                    payload = {
                        "event_type": "NEW_LOT_BROADCAST",
                        "data": {
                            "lot_code": f"EW-2026-MH-{random.randint(100, 999):06d}",
                            "material": "Motherboard PCB",
                            "weight_kg": round(random.uniform(8.0, 35.0), 1),
                            "city": random.choice(["Mumbai (Dharavi)", "Pune (PCMC)", "Delhi (Seelampur)", "Bengaluru (Peenya)"]),
                            "expected_inr": round(random.uniform(2200, 8500), 2)
                        },
                        "timestamp": datetime.utcnow().isoformat()
                    }
                elif chosen_event == "HANDOVER_VERIFIED":
                    payload = {
                        "event_type": "HANDOVER_VERIFIED",
                        "data": {
                            "handover_code": f"HANDOVER-{random.randint(100, 999):06d}",
                            "recycler": "EcoGreen Authorized Recyclers",
                            "verified_weight_kg": round(random.uniform(12.0, 45.0), 1),
                            "payout_inr": round(random.uniform(3000, 12000), 2),
                            "sha256": "8f3b2a1c9e...d47a"
                        },
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    payload = {
                        "event_type": "MINERAL_RECOVERED",
                        "data": {
                            "gold_grams": round(random.uniform(0.12, 1.45), 2),
                            "copper_kg": round(random.uniform(2.5, 8.4), 1),
                            "co2_avoided_kg": round(random.uniform(15.0, 65.0), 1)
                        },
                        "timestamp": datetime.utcnow().isoformat()
                    }

                await websocket.send_json(payload)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

async def notify_live_event(event_dict: dict):
    """External helper to broadcast real events to all connected WebSocket clients."""
    await manager.broadcast(event_dict)
