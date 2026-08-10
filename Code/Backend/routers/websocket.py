from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from models import DetectionEvent
import schemas
from database import SessionLocal
import time




router = APIRouter(tags=["Live Detections"])

ACTIVE_CONNECTIONS: Dict[int, List[WebSocket]] = {}
LAST_DB_SAVE_TIMES = {}
STORABLE_EVENTS = {"no_hard_hat", "no_safety_vest"}

# FIX 3: Removed 'db: Session' from parameters since we create it inside!
def save_detections_to_db(detections: list): 
    """
    Runs in background after WebSocket broadcast completes.
    Only saves violation events — not every frame detection.
    """
    db = SessionLocal()
    try:
        for det in detections:
            if det["event_type"] not in STORABLE_EVENTS:
                continue 

            record = DetectionEvent(
                camera_id=det["camera_id"],
                event_type=det["event_type"],
                confidence=det["confidence"],
                timestamp_epoch=det["timestamp_epoch"],
                timestamp_clock=det["timestamp_clock"],
                session_start_epoch=det["session_start_epoch"],
                bbox=det["bbox"]
            
            )
            db.add(record)

        db.commit()
        print("✅ Row added successfully")
    except Exception as e:
        db.rollback()
        print(f"❌ DB write failed: {e}")
    finally:
        db.close()


@router.websocket("/ws/live/{camera_id}")
async def live_detections_websocket(websocket: WebSocket, camera_id: int):
    await websocket.accept()

    if camera_id not in ACTIVE_CONNECTIONS:
        ACTIVE_CONNECTIONS[camera_id] = []
    ACTIVE_CONNECTIONS[camera_id].append(websocket)

    print(f"🔌 Client connected to Camera #{camera_id}")

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ACTIVE_CONNECTIONS[camera_id].remove(websocket)
        if not ACTIVE_CONNECTIONS[camera_id]:
            del ACTIVE_CONNECTIONS[camera_id]
        print(f"❌ Client disconnected from Camera #{camera_id}")


@router.post("/detections/ingest", status_code=status.HTTP_200_OK)
async def ingest_detections(payload: schemas.FrameDetectionsPayload, background_tasks: BackgroundTasks):
    camera_id = payload.camera_id
    clients = ACTIVE_CONNECTIONS.get(camera_id, [])

    # FIX 2: Move this OUTSIDE the 'if clients' block so the DB always gets the data!
    data = payload.model_dump()

    if clients:
        stale_clients = []
        for client in clients:
            try:
                await client.send_json(data)
            except Exception:
                stale_clients.append(client)

        for dead_client in stale_clients:
            clients.remove(dead_client)

    
    has_violations = any(
        d["event_type"] in STORABLE_EVENTS
        for d in data["detections"]
    )
    
    current_time = time.time()
    last_save = LAST_DB_SAVE_TIMES.get(camera_id, 0)
    
    # Only save to DB if there is a violation AND 2 secons have passed
    if has_violations and (current_time - last_save) >= 2.0:
        LAST_DB_SAVE_TIMES[camera_id] = current_time
        background_tasks.add_task(
            save_detections_to_db,
            data["detections"]
        )
        print("📝 Queued throttled DB save task for violations.")

    return {"status": "broadcasted", "active_listeners": len(clients)}