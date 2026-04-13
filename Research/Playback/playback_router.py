"""
playback_router.py
------------------
FastAPI router for PlaybackPlayer.jsx

Mount in your main.py:
    from playback_router import router as playback_router
    app.include_router(playback_router, prefix="/playback")

Dependencies:
    pip install fastapi asyncpg python-dateutil aiofiles

Environment variables:
    NVR_HOST       = 192.168.1.50        (NVR LAN IP)
    NVR_USER       = admin
    NVR_PASS       = yourpassword
    NVR_RTSP_PORT  = 554
    CLIPS_DIR      = /tmp/clips          (where exported MP4s are written)
    MEDIA_BASE_URL = http://localhost:8888
    DATABASE_URL   = postgresql://user:pass@localhost/sitedb
"""

import asyncio
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import asyncpg
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter()

# ── Config ────────────────────────────────────────────────────────────────────

NVR_HOST      = os.environ.get("NVR_HOST",      "192.168.1.50")
NVR_USER      = os.environ.get("NVR_USER",      "admin")
NVR_PASS      = os.environ.get("NVR_PASS",      "password123")
NVR_RTSP_PORT = int(os.environ.get("NVR_RTSP_PORT", "554"))
CLIPS_DIR     = Path(os.environ.get("CLIPS_DIR", "/tmp/clips"))
MEDIA_BASE    = os.environ.get("MEDIA_BASE_URL", "http://localhost:8888")
DATABASE_URL  = os.environ.get("DATABASE_URL",  "postgresql://user:pass@localhost/sitedb")

CLIPS_DIR.mkdir(parents=True, exist_ok=True)

# ── DB pool (shared via app state in production) ──────────────────────────────

_pool = None

async def get_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    return _pool

# ── Helpers ───────────────────────────────────────────────────────────────────

def nvr_rtsp_playback_url(camera_id: int, start: datetime, end: datetime) -> str:
    """
    Hikvision RTSP playback URL format.
    Channel numbering: camera 1 = track 101, camera 2 = track 201, etc.
    """
    track = camera_id * 100 + 1
    start_str = start.strftime("%Y%m%dT%H%M%SZ")
    end_str   = end.strftime("%Y%m%dT%H%M%SZ")
    return (
        f"rtsp://{NVR_USER}:{NVR_PASS}@{NVR_HOST}:{NVR_RTSP_PORT}"
        f"/Streaming/tracks/{track}"
        f"?starttime={start_str}&endtime={end_str}"
    )

def nvr_hls_playlist_url(camera_id: int, date_str: str) -> str:
    """
    Points to the HLS playlist served by MediaMTX.
    MediaMTX is configured to pull from the NVR RTSP and serve HLS.
    Path format: /cam{id}/{date}/index.m3u8
    """
    return f"{MEDIA_BASE}/cam{camera_id}/{date_str}/index.m3u8"

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stream")
async def get_stream(camera: int, date: str):
    """
    Returns the HLS playlist URL for a given camera and date.

    React calls this first — it gets back a URL it can feed into hls.js.

    In production, you may want to check whether footage exists for that
    date before returning, and return a 404 if it doesn't.
    """
    try:
        datetime.strptime(date, "%Y-%m-%d")  # validate format
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if camera not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="Invalid camera ID.")

    playlist_url = nvr_hls_playlist_url(camera, date)

    # Optionally check if the file exists on disk before responding
    # hls_path = Path(f"/var/mediamtx/recordings/cam{camera}/{date}/index.m3u8")
    # if not hls_path.exists():
    #     raise HTTPException(status_code=404, detail="No footage for this date.")

    return JSONResponse({
        "playlist_url":  playlist_url,
        "camera":        camera,
        "date":          date,
    })


@router.get("/events")
async def get_events(camera: int, date: str):
    """
    Returns all detection events for a given camera and date.

    Expected PostgreSQL table schema:
        CREATE TABLE detections (
            id               SERIAL PRIMARY KEY,
            camera_id        INTEGER NOT NULL,
            type             TEXT NOT NULL,       -- 'ppe','zone','machinery','headcount'
            description      TEXT NOT NULL,
            confidence       INTEGER NOT NULL,    -- 0–100
            timestamp_epoch  BIGINT NOT NULL,     -- Unix timestamp of the frame
            timestamp_clock  TEXT NOT NULL,       -- HH:MM:SS string for display
            session_start_epoch BIGINT NOT NULL,  -- Unix timestamp of session start (start of recording day)
            bbox_x           FLOAT,               -- normalised 0–1
            bbox_y           FLOAT,
            bbox_w           FLOAT,
            bbox_h           FLOAT,
            created_at       TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX ON detections (camera_id, timestamp_epoch);
    """
    try:
        day = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format.")

    day_start = int(day.timestamp())
    day_end   = int((day + timedelta(days=1)).timestamp())

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, camera_id, type, description, confidence,
                   timestamp_epoch, timestamp_clock, session_start_epoch,
                   bbox_x, bbox_y, bbox_w, bbox_h
            FROM detections
            WHERE camera_id = $1
              AND timestamp_epoch BETWEEN $2 AND $3
            ORDER BY timestamp_epoch ASC
            """,
            camera, day_start, day_end,
        )

    return JSONResponse([
        {
            "id":                   row["id"],
            "camera_id":            row["camera_id"],
            "type":                 row["type"],
            "description":          row["description"],
            "confidence":           row["confidence"],
            "timestamp_epoch":      row["timestamp_epoch"],
            "timestamp_clock":      row["timestamp_clock"],
            "session_start_epoch":  row["session_start_epoch"],
            "bbox": {
                "x": row["bbox_x"],
                "y": row["bbox_y"],
                "w": row["bbox_w"],
                "h": row["bbox_h"],
            } if row["bbox_x"] is not None else None,
        }
        for row in rows
    ])


class ExportRequest(BaseModel):
    camera:    int
    date:      str
    start_sec: float   # seconds from session start
    end_sec:   float


@router.post("/export")
async def export_clip(req: ExportRequest, background_tasks: BackgroundTasks):
    """
    Extracts a time-bounded MP4 clip from the NVR via FFmpeg.

    Uses Hikvision's RTSP playback URL with starttime/endtime params.
    The actual FFmpeg process runs in the background — this endpoint
    returns immediately with a clip_url; the file is ready in ~5–10s.

    For production, consider a proper job queue (Celery / ARQ) for this.
    """
    try:
        day = datetime.strptime(req.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format.")

    if req.camera not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="Invalid camera ID.")

    clip_duration = req.end_sec - req.start_sec
    if clip_duration <= 0 or clip_duration > 600:
        raise HTTPException(status_code=400, detail="Clip duration must be 1–600 seconds.")

    # Calculate absolute timestamps
    session_start = day.replace(hour=7, minute=0, second=0)  # adjust to your recording start
    clip_start    = session_start + timedelta(seconds=req.start_sec)
    clip_end      = session_start + timedelta(seconds=req.end_sec)

    clip_id   = uuid.uuid4().hex[:10]
    filename  = f"clip_cam{req.camera}_{req.date}_{clip_id}.mp4"
    out_path  = CLIPS_DIR / filename
    clip_url  = f"/clips/{filename}"  # served by your FastAPI StaticFiles mount

    rtsp_url  = nvr_rtsp_playback_url(req.camera, clip_start, clip_end)

    background_tasks.add_task(
        run_ffmpeg_export,
        rtsp_url=rtsp_url,
        out_path=str(out_path),
        duration=clip_duration,
    )

    return JSONResponse({
        "clip_url":   clip_url,
        "clip_id":    clip_id,
        "start_time": clip_start.isoformat(),
        "end_time":   clip_end.isoformat(),
        "status":     "processing",
    })


async def run_ffmpeg_export(rtsp_url: str, out_path: str, duration: float):
    """
    Runs FFmpeg to extract a clip from the NVR RTSP playback stream.

    Uses Apple hardware encoder (h264_videotoolbox) on Mac Mini.
    Falls back to libx264 on other platforms.

    Key flags:
      -rtsp_transport tcp   : more reliable than UDP for playback
      -t {duration}         : stop after N seconds
      -vcodec h264_videotoolbox : Apple hardware encoder (Mac Mini)
      -acodec aac           : audio passthrough
      -movflags +faststart  : optimise MP4 for web playback (moov atom first)
    """
    cmd = [
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-t", str(duration),
        "-vcodec", "h264_videotoolbox",  # Mac Mini hardware encoder
        "-b:v", "2M",
        "-acodec", "aac",
        "-movflags", "+faststart",
        "-y",          # overwrite if exists
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


# ── How to mount clips as static files in main.py ────────────────────────────
#
#   from fastapi.staticfiles import StaticFiles
#   app.mount("/clips", StaticFiles(directory="/tmp/clips"), name="clips")
#
# ── How to register this router in main.py ───────────────────────────────────
#
#   from playback_router import router as playback_router
#   app.include_router(playback_router, prefix="/playback", tags=["playback"])
#
# ── CORS (needed since React runs on a different port) ───────────────────────
#
#   from fastapi.middleware.cors import CORSMiddleware
#   app.add_middleware(
#       CORSMiddleware,
#       allow_origins=["http://localhost:3000", "https://your-dashboard.vercel.app"],
#       allow_methods=["*"],
#       allow_headers=["*"],
#   )
