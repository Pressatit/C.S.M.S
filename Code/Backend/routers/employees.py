from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
router = APIRouter(
    prefix="/employees",
    tags=["employees"]
)

@router.post("/")    ##POST
def create_employee(
    request: schemas.EmployeeCreate,
    db: Session = Depends(get_db)
):
    employee = models.Employee(
        employee_id=request.employee_id,
        first_name=request.first_name,
        surname=request.surname,
        role=request.role,
        id_number=request.id_number,
        phone_number=request.phone_number,
        ble_uuid=request.ble_uuid
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee

@router.get("/") ##GET
def get_employees(
    db: Session = Depends(get_db)
):
    employees = db.query(
        models.Employee
    ).all()

    return employees

@router.get("/{id}")
def get_employee(
    id:int,
    db:Session=Depends(get_db)
):
    employee=db.query(
        models.Employee
    ).filter(
        models.Employee.id==id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )
    return employee

@router.put("/{id}") ##Update
def update_employee(
    id:int,
    request:schemas.EmployeeCreate,
    db:Session=Depends(get_db)
):

    employee=db.query(
      models.Employee
    ).filter(
      models.Employee.id==id
    ).first()

    if not employee:
        raise HTTPException(
          status_code=404,
          detail="Employee not found"
        )

    employee.first_name=request.first_name
    employee.surname=request.surname
    employee.role=request.role
    employee.phone_number=request.phone_number

    db.commit()

    return employee

@router.delete("/{id}")##Delete
def delete_employee(
   id:int,
   db:Session=Depends(get_db)
):

    employee=db.query(
       models.Employee
    ).filter(
       models.Employee.id==id
    ).first()

    if not employee:
        raise HTTPException(
           status_code=404,
           detail="Employee not found"
        )

    db.delete(employee)
    db.commit()

    return {
      "message":"Employee deleted"
    }