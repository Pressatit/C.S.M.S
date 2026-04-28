from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/ble",
    tags=["BLE Tracking"]
)


@router.post("/")
def create_ble_position(
    request: schemas.BLEPositionCreate,
    db: Session = Depends(get_db)
):
    # Verify employee exists
    employee = db.query(
        models.Employee
    ).filter(
        models.Employee.employee_id == request.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # Insert position
    position = models.BLEPosition(
        employee_id=request.employee_id,
        x_meters=request.x_meters,
        y_meters=request.y_meters,
        zone=request.zone,
        timestamp_epoch=request.timestamp_epoch
    )

    db.add(position)
    db.commit()
    db.refresh(position)

    return position


@router.get("/")
def get_positions(
    db: Session = Depends(get_db)
):
    return db.query(
        models.BLEPosition
    ).all()


@router.get("/employee/{employee_id}")  # Get employee positions
def get_employee_positions(
    employee_id: str,
    db: Session = Depends(get_db)
):
    return db.query(
        models.BLEPosition
    ).filter(
        models.BLEPosition.employee_id == employee_id
    ).all()


@router.get("/latest/{employee_id}")  # Latest employee location
def latest_position(
    employee_id: str,
    db: Session = Depends(get_db)
):
    record = db.query(
        models.BLEPosition
    ).filter(
        models.BLEPosition.employee_id == employee_id
    ).order_by(
        models.BLEPosition.timestamp_epoch.desc()
    ).first()

    return record


@router.delete("/{id}")  # Optional admin delete
def delete_position(
    id: int,
    db: Session = Depends(get_db)
):
    position = db.query(
        models.BLEPosition
    ).filter(
        models.BLEPosition.id == id
    ).first()

    if not position:
        raise HTTPException(
            status_code=404,
            detail="Not found"
        )

    db.delete(position)
    db.commit()

    return {"message": "Deleted"}