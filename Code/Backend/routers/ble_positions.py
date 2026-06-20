from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(
    prefix="/ble",
    tags=["BLE Tracking"]
)


@router.post("/")
def create_ble_position(
    request: schemas.BLEPositionCreate,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
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
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    return db.query(
        models.BLEPosition
    ).all()


@router.get("/employee/{employee_id}")
def get_employee_positions(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    return db.query(
        models.BLEPosition
    ).filter(
        models.BLEPosition.employee_id == employee_id
    ).all()


@router.get("/latest/{employee_id}")
def latest_position(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    record = db.query(
        models.BLEPosition
    ).filter(
        models.BLEPosition.employee_id == employee_id
    ).order_by(
        models.BLEPosition.timestamp_epoch.desc()
    ).first()

    return record


@router.delete("/{id}")
def delete_position(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
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
