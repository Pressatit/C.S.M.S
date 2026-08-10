from sqlalchemy import text,Uuid
from fastapi import FastAPI, Depends,HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from routers import recording
from database import engine, get_db
import os

import models

from routers import users
from routers import employees
from routers import attendance
from routers import assets
from routers import telematics
from routers import detections
from routers import ble_positions
from routers import websocket,playback



@asynccontextmanager
async def lifespan(app: FastAPI):

    models.Base.metadata.create_all(bind=engine)

    # Runs on startup
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_recordings_camera_started_at "
                "ON recordings (camera_id, started_at)"
            )
        )
    yield

app=FastAPI(
    root_path="/",
    title="CSMS_backend",
    description="This is the heart of the robust CSMS",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create tables
models.Base.metadata.create_all(bind=engine)


@app.get("/health")
def check_health(
    db: Session = Depends(get_db)
):
    db.execute(text("SELECT 1"))
    return {"status": "Connected"}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RECORDINGS_DIR = os.path.join(BASE_DIR, "../../scripts/recordings")



@app.get("/recordings-static/{path:path}")
async def serve_recording(path: str):
    file_path = os.path.join(RECORDINGS_DIR, path)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        file_path,
        media_type="video/mp4",
        headers={"Cache-Control": "public, max-age=86400"},
    )

# Routers
app.include_router(users.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(assets.router)
app.include_router(telematics.router)
app.include_router(detections.router)
app.include_router(ble_positions.router)
app.include_router(websocket.router)
app.include_router(playback.router)
app.include_router(recording.router)