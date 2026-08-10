"""
routers/playback.py
FastAPI router for PlaybackPlayer.jsx
"""

import asyncio
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path
import models

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

router = APIRouter(prefix="/playback")

# ── Config ────────────────────────────────────────────────────────────────────
MEDIA_BASE = "http://localhost:8888"
CLIPS_DIR  = Path(os.environ.get("CLIPS_DIR", "/tmp/clips"))
CLIPS_DIR.mkdir(parents=True, exist_ok=True)

VALID_CAMERAS = [1, 2, 3, 4, 5]

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stream")
async def get_stream(camera: int, date: str):
    """
    Returns the HLS playlist URL for a given camera.
    PlaybackPlayer.jsx calls this first.
    """
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if camera not in VALID_CAMERAS:
        raise HTTPException(status_code=400, detail="Invalid camera ID.")

    playlist_url = f"{MEDIA_BASE}/cam{camera}/index.m3u8"

    return JSONResponse({
        "playlist_url": playlist_url,
        "camera":       camera,
        "date":         date,
    })


@router.get("/events")
async def get_events(camera: int, date: str, db: Session = Depends(get_db)):
    """
    Returns all detection events for a given camera and date.
    Feeds the timeline pins and event log in PlaybackPlayer.jsx.
    """
    try:
        day = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format.")

    if camera not in VALID_CAMERAS:
        raise HTTPException(status_code=400, detail="Invalid camera ID.")

    day_start = int(day.timestamp())
    day_end   = int((day + timedelta(days=1)).timestamp())

    rows = db.execute(text("""
        SELECT id, camera_id, event_type AS type, event_type AS description, confidence,
               timestamp_epoch, timestamp_clock, session_start_epoch,
               bbox
        FROM detection_events
        WHERE camera_id = :camera
          AND timestamp_epoch BETWEEN :start AND :end
        ORDER BY timestamp_epoch ASC
    """), {"camera": camera, "start": day_start, "end": day_end}).fetchall()

    return JSONResponse([
        {
            "id":                  row.id,
            "camera_id":           row.camera_id,
            "type":                row.type,
            "description":         row.description,
            "confidence":          row.confidence,
            "timestamp_epoch":     row.timestamp_epoch,
            "timestamp_clock":     row.timestamp_clock,
            "session_start_epoch": row.session_start_epoch,
            "bbox":                row.bbox 
        }
        for row in rows
    ])

class ExportRequest(BaseModel):
    camera:    int
    date:      str
    start_sec: float
    end_sec:   float


@router.post("/export")
async def export_clip(req: ExportRequest, background_tasks: BackgroundTasks):
    """
    Extracts a time-bounded MP4 clip via FFmpeg.
    Returns clip_url immediately; file is ready in a few seconds.
    """
    try:
        day = datetime.strptime(req.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format.")

    if req.camera not in VALID_CAMERAS:
        raise HTTPException(status_code=400, detail="Invalid camera ID.")

    clip_duration = req.end_sec - req.start_sec
    if clip_duration <= 0 or clip_duration > 600:
        raise HTTPException(status_code=400, detail="Clip duration must be 1-600 seconds.")

    clip_id  = uuid.uuid4().hex[:10]
    filename = f"clip_cam{req.camera}_{req.date}_{clip_id}.mp4"
    out_path = CLIPS_DIR / filename
    clip_url = f"/clips/{filename}"

    # For dev simulation: clip from the live HLS stream
    rtsp_url = f"rtsp://localhost:8554/cam{req.camera}"

    background_tasks.add_task(
        run_ffmpeg_export,
        rtsp_url=rtsp_url,
        out_path=str(out_path),
        duration=clip_duration,
    )

    return JSONResponse({
        "clip_url": clip_url,
        "clip_id":  clip_id,
        "status":   "processing",
    })


async def run_ffmpeg_export(rtsp_url: str, out_path: str, duration: float):
    cmd = [
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-t", str(duration),
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-movflags", "+faststart",
        "-y",
        out_path,
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            print(f"[FFmpeg export error] {stderr.decode()}")
    except Exception as e:
        print(f"[FFmpeg export exception] {e}")

@router.get("/seek")  
def seek_recording(camera_id: int, timestamp: datetime, db: Session = Depends(get_db)):
    segment = db.query(models.Recording).filter(
        models.Recording.camera_id == camera_id,
        models.Recording.started_at <= timestamp,
        models.Recording.ended_at >= timestamp
    ).first()

    if not segment:
        raise HTTPException(status_code=404, detail="No recording found for that time")

    seek_offset = (timestamp - segment.started_at).total_seconds()
    return {
        "file_path": segment.file_path,
        "seek_seconds": seek_offset
    }