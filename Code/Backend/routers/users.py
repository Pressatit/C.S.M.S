import models
import schemas
from sqlalchemy.orm import Session
from fastapi import APIRouter,HTTPException,Depends
from database import get_db
from typing import List
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

router=APIRouter(

)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/register", response_model=schemas.TokenResponse)
def register(request: schemas.users, db: Session = Depends(get_db)):
    # 1. Validation: Ensure email isn't empty
    if not request.email:
        raise HTTPException(status_code=400, detail="Email is required")

    # 2. Check existence
    existing_user = db.query(models.User).filter(models.User.email == request.email).first()
    if existing_user:
        # Log this to your terminal so you can see WHICH email is causing the hit
        print(f"Conflict: Email {request.email} already exists in DB") 
        raise HTTPException(status_code=400, detail=f"User with {request.email} already exists")
  
    hashed_password = get_password_hash(request.password)
    query=models.User(
        name=request.name,
        role=request.role or "user",
        email=request.email,
        password=hashed_password
    )
    db.add(query)
    db.commit()
    db.refresh(query)

    access_token = create_access_token({"sub": query.email, "user_id": query.id})
    
    return schemas.TokenResponse(
        access_token=access_token,
        user=schemas.showUser(
            id=query.id,
            name=query.name,
            role=query.role,
            email=query.email
        )
    )

@router.post("/login", response_model=schemas.TokenResponse)
def login(request: schemas.LoginRequest, db :Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": user.email, "user_id": user.id})
    
    return schemas.TokenResponse(
        access_token=access_token,
        user=schemas.showUser(
            id=user.id,
            name=user.name,
            role=user.role,
            email=user.email
        )
    )

@router.post("/user")
def add_user(request: schemas.users, db :Session = Depends(get_db)):
    hashed_password = get_password_hash(request.password)
    query=models.User(name=request.name,role=request.role,email=request.email,password=hashed_password)
    db.add(query)
    db.commit()
    db.refresh(query)

    return request

@router.get("/user",response_model=List[schemas.showUser])
def get_all_users(db:Session =Depends(get_db)):
    users=db.query(models.User).all()

    return users
