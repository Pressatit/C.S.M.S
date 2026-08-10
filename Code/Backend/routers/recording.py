import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from datetime import datetime, timedelta
import models
import re
import subprocess
import json

API_BASE = "http://localhost:8000"

router = APIRouter(prefix="/recordings")

def get_file_size_mb(path: str) -> float | None:
    try:
        return round(os.path.getsize(path) / (1024 * 1024), 2)
    except Exception as e:
        print(f"[file_size error] {e}")
        return None

def get_duration_secs(path: str) -> int | None:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "json", path],
            capture_output=True,
            text=True,
            timeout=10
        )
        duration = float(json.loads(result.stdout)["format"]["duration"])
        return int(duration)
    except Exception as e:
        print(f"[ffprobe error] {e}")
        return None

@router.post("/register")
def register_segment(
    camera_id: int,
    file_path: str,
    file_size_mb: float = None,
    duration_secs: int = None,
    db: Session = Depends(get_db)
):
    file_path = file_path.replace("\\", "/")  # keep this, just for slash consistency

    match = re.search(r'(\d{4}-\d{2}-\d{2})[\\/](\d{2})-(\d{2})-(\d{2})', file_path)
    if not match:
        raise HTTPException(status_code=400, detail="Could not parse timestamp from file path")

    date_str, hour, minute, second = match.groups()
    started_at = datetime.strptime(f"{date_str} {hour}:{minute}:{second}", "%Y-%m-%d %H:%M:%S")

    if file_size_mb is None:
        file_size_mb = get_file_size_mb(file_path)

    if duration_secs is None:
        duration_secs = get_duration_secs(file_path)

    # Keep the database timeline aligned with the actual recorded file.
    ended_at = started_at + timedelta(seconds=duration_secs or 30 * 60)

    segment = models.Recording(
        camera_id=camera_id,
        file_path=file_path,
        started_at=started_at,
        ended_at=ended_at,
        file_size_mb=file_size_mb,
        duration_secs=duration_secs
    )
    try:
      db.add(segment)
      db.commit()
      db.refresh(segment)
      return {"status": "registered", "id": segment.id}

    except Exception as error:
      db.rollback()  # 🚨 CRITICAL: Reverses failed changes to clear the connection transaction
      print(f"❌ Database error occurred: {error}")  # Logs the error to your console
      return {"status": "failed", "detail": str(error)}
    

@router.get("/list")
def list_segments(camera_id: int, date: str, db: Session = Depends(get_db)):
    target_date = datetime.strptime(date, "%Y-%m-%d").date()
    segments = db.query(models.Recording).filter(
        models.Recording.camera_id == camera_id,
        models.Recording.started_at >= datetime.combine(target_date, datetime.min.time()),
        models.Recording.started_at < datetime.combine(target_date, datetime.max.time())
    ).order_by(models.Recording.started_at).all()

    if not segments:
        raise HTTPException(status_code=404, detail="No recordings found for that date.")

    result = []
    for seg in segments:

        relative_path = seg.file_path.replace("\\", "/").split("/recordings/")[-1]
        full_path = os.path.join(os.environ.get("RECORDINGS_DIR", "../../scripts/recordings"), relative_path)
        # Skip rows whose file has been removed from disk (e.g. MediaMTX
        # cleanup of a partial segment) so stale rows never surface as 404s.
        if not os.path.isfile(full_path):
            continue
        result.append({
            "id": seg.id,
            "started_at": seg.started_at,
            "ended_at": seg.ended_at,
            "duration_secs": seg.duration_secs,
            "video_url": f"{API_BASE}/recordings-static/{relative_path}"
        })

    if not result:
        raise HTTPException(status_code=404, detail="No recordings available for that date.")

    return result