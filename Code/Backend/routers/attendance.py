from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)

@router.post("/") # CREATE
def mark_attendance(
    request: schemas.AttendanceCreate,
    db: Session = Depends(get_db)
):
    # 1. Check if the employee actually exists in the system
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == request.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # 2. Create the new attendance object
    attendance = models.AttendanceRecord(
        employee_id=request.employee_id,
        attendance=request.attendance
    )

    # 3. Save to database
    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return attendance

@router.get("/") # READ ALL
def get_attendance(db: Session = Depends(get_db)):
    records = db.query(models.AttendanceRecord).all()
    return records

@router.get("/{id}") # READ ONE
def get_attendance_record(id: int, db: Session = Depends(get_db)):
    record = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.id == id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return record

@router.put("/{id}") # UPDATE
def update_attendance(
    id: int, 
    request: schemas.AttendanceCreate, 
    db: Session = Depends(get_db)
):
    record = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.id == id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Update the specific field
    record.attendance = request.attendance
    db.commit()
    db.refresh(record)

    return record

@router.delete("/{id}") # DELETE
def delete_attendance(id: int, db: Session = Depends(get_db)):
    record = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.id == id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    db.delete(record)
    db.commit()

    return {"message": "Attendance deleted"}