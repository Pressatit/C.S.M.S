from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)

@router.post("/")
def mark_attendance(
    request: schemas.AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == request.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    attendance = models.AttendanceRecord(
        employee_id=request.employee_id,
        attendance=request.attendance
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return attendance

@router.get("/")
def get_attendance(
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    records = db.query(models.AttendanceRecord).all()
    return records

@router.get("/{id}")
def get_attendance_record(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    record = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.id == id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    return record

@router.put("/{id}")
def update_attendance(
    id: int,
    request: schemas.AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    record = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.id == id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    record.attendance = request.attendance
    db.commit()
    db.refresh(record)

    return record

@router.delete("/{id}")
def delete_attendance(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    record = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.id == id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    db.delete(record)
    db.commit()

    return {"message": "Attendance deleted"}
