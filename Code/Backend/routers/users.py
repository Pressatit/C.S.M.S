import models
import schemas
from sqlalchemy.orm import Session
from fastapi import APIRouter,HTTPException,Depends
from database import get_db
from typing import List

router=APIRouter(

)

@router.post("/user")
def add_user(request: schemas.users, db :Session = Depends(get_db)):
    query=models.User(name=request.name,role=request.role,email=request.email,password=request.password)
    db.add(query)
    db.commit()
    db.refresh(query)

    return request

@router.get("/user",response_model=List[schemas.showUser])
def get_all_users(db:Session =Depends(get_db)):
    users=db.query(models.User).all()

    return users
