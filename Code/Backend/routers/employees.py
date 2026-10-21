from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

import models
import schemas
from database import get_db
from auth import get_current_user
router = APIRouter(
    prefix="/employees",
    tags=["employees"]
)

def generate_initials(first_name: str, second_name: str) -> str:
    # Remove accidental leading/trailing spaces
    f_name = (first_name or "").strip()
    s_name = (second_name or "").strip()
    
    # Extract first letters and make them uppercase
    f_initial = f_name[0].upper() if f_name else ""
    s_initial = s_name[0].upper() if s_name else ""
    
    initials = f"{f_initial}{s_initial}"
    
    # Fallback if both fields were somehow empty
    return initials if initials else "EE"

@router.post("")
def create_employee(
    request: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):

    result = db.execute(text("SELECT nextval('employees_id_seq')"))
    next_id = result.scalar()

    # 2. Format the fields safely in Python memory first
    formatted_emp_id = f"EMP{next_id:03d}"
    calculated_initials = generate_initials(request.first_name, request.second_name)

    employee = models.Employee(
        id=next_id,  
        employee_id=formatted_emp_id,
        initials=calculated_initials,
        first_name=request.first_name,
        second_name=request.second_name,
        role=request.role,
        id_number=request.id_number,
        phone_number=request.phone_number,
        ble_uuid=request.ble_uuid
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee

@router.get("")
def get_employees(
    db: Session = Depends(get_db),
    #current_user: models.Profile = Depends(get_current_user)
):
    employees = db.query(
        models.Employee
    ).all()

    return employees

@router.get("/{id}")
def get_employee(
    id: int,
    db: Session = Depends(get_db),
    #current_user: models.Profile = Depends(get_current_user)
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

@router.put("/{id}")
def update_employee(
    id: int,
    request: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
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

@router.delete("/{id}")
def delete_employee(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
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