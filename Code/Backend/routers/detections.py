from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/detections",
    tags=["Detections"]
)

@router.post("/")
def create_detection(
    request:schemas.DetectionEventCreate,
    db: Session = Depends(get_db)
):
    detection = models.DetectionEvent(
        camera_id=request.camera_id,
        event_type=request.event_type,
        confidence=request.confidence,
        timestamp_epoch=request.timestamp_epoch,
        bbox=request.bbox.model_dump()
    )

    db.add(detection)
    db.commit()
    db.refresh(detection)

    return detection

@router.get("/")
def get_detections(
    db:Session=Depends(get_db)
):
    return db.query(
        models.DetectionEvent
    ).all()

@router.get("/camera/{camera_id}") ##Filter by camera i.e camera 1, camera 2 etc
def detections_by_camera(
    camera_id:int,
    db:Session=Depends(get_db)
):
    return db.query(
      models.DetectionEvent
    ).filter(
      models.DetectionEvent.camera_id==camera_id
    ).all()

@router.get("/type/{event_type}") ##Filter by event type i.e could be ppe or personnel
def detections_by_type(
   event_type:str,
   db:Session=Depends(get_db)
):

   return db.query(
      models.DetectionEvent
   ).filter(
      models.DetectionEvent.event_type==event_type
   ).all()

@router.delete("/{id}") ##Admin cleanup
def delete_detection(
    id:int,
    db:Session=Depends(get_db)
):
    event=db.query(
      models.DetectionEvent
    ).filter(
      models.DetectionEvent.id==id
    ).first()

    if not event:
        raise HTTPException(
          status_code=404,
          detail="Event not found"
        )

    db.delete(event)
    db.commit()

    return {
      "message":"Detection deleted"
    }

