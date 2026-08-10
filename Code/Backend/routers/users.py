import models
import schemas
from sqlalchemy.orm import Session
from fastapi import APIRouter,HTTPException,Depends
from database import get_db
from typing import List
import os
from uuid import UUID
from supabase import Client, create_client
from auth import get_current_user

router=APIRouter( tags=["Users"]

)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be configured")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
admin_supabase: Client | None = (
    create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if SUPABASE_SERVICE_ROLE_KEY
    else None
)

def auth_error_detail(exc: Exception) -> str:
    return getattr(exc, "message", None) or str(exc)

def validate_password_strength(password: str) -> None:
    checks = [
        (len(password) >= 8, "be at least 8 characters"),
        (any(char.islower() for char in password), "include a lowercase letter"),
        (any(char.isupper() for char in password), "include an uppercase letter"),
        (any(char.isdigit() for char in password), "include a number"),
        (any(not char.isalnum() for char in password), "include a symbol"),
    ]
    missing = [message for passed, message in checks if not passed]
    if missing:
        raise HTTPException(
            status_code=400,
            detail="Password must " + ", ".join(missing) + "."
        )

def build_user_response(profile: models.Profile) -> schemas.showUser:
    return schemas.showUser(
        id=str(profile.id),
        name=profile.name,
        role=profile.role,
        email=profile.email
    )

def create_or_update_profile(db: Session, user_id: str, email: str, name: str, role: str) -> models.Profile:
    profile_id = UUID(user_id)
    profile = db.query(models.Profile).filter(models.Profile.id == profile_id).first()
    if not profile:
        profile = db.query(models.Profile).filter(models.Profile.email == email).first()

    if profile:
        profile.id = profile_id
        profile.name = name or profile.name
        profile.role = role or profile.role or "user"
        profile.email = email
    else:
        profile = models.Profile(
            id=profile_id,
            name=name,
            role=role or "user",
            email=email
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return profile

def get_or_create_profile(db: Session, user_id: str, email: str, user_metadata: dict | None = None) -> models.Profile:
    profile = db.query(models.Profile).filter(models.Profile.id == UUID(user_id)).first()
    if profile:
        return profile

    metadata = user_metadata or {}
    name = metadata.get("name") or email.split("@")[0]
    role = metadata.get("role") or "user"
    return create_or_update_profile(db, user_id, email, name, role)

@router.post("/token/refresh", response_model=schemas.TokenResponse)
def refresh_token(request: schemas.RefreshRequest, db: Session = Depends(get_db)):
    try:
        auth_response = supabase.auth.refresh_session(request.refresh_token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=auth_error_detail(exc))

    if not auth_response.user or not auth_response.session:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    profile = get_or_create_profile(
        db,
        auth_response.user.id,
        auth_response.user.email or "",
        auth_response.user.user_metadata
    )

    return schemas.TokenResponse(
        access_token=auth_response.session.access_token,
        refresh_token=auth_response.session.refresh_token,
        user=build_user_response(profile)
    )

@router.post("/register", response_model=schemas.TokenResponse)
def register(request: schemas.RegisterRequest, db: Session = Depends(get_db)):
    # 1. Validation: Ensure email isn't empty
    if not request.email:
        raise HTTPException(status_code=400, detail="Email is required")

    existing_profile = db.query(models.Profile).filter(models.Profile.email == request.email).first()
    if existing_profile:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        if admin_supabase:
            created_user = admin_supabase.auth.admin.create_user({
                "email": request.email,
                "password": request.password,
                "email_confirm": True,
                "user_metadata": {
                    "name": request.name,
                    "role": request.role or "user"
                }
            })
            if not created_user.user:
                raise HTTPException(status_code=400, detail="Registration failed")

            auth_response = supabase.auth.sign_in_with_password({
                "email": request.email,
                "password": request.password
            })
        else:
            auth_response = supabase.auth.sign_up({
                "email": request.email,
                "password": request.password,
                "options": {
                    "data": {
                        "name": request.name,
                        "role": request.role or "user"
                    }
                }
            })
    except Exception as exc:
        raise HTTPException(status_code=400, detail=auth_error_detail(exc))

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Registration failed")

    if not auth_response.session:
        raise HTTPException(
            status_code=400,
            detail="Registration created. Confirm the email before logging in."
        )

    profile = create_or_update_profile(
        db,
        auth_response.user.id,
        auth_response.user.email or request.email,
        request.name,
        request.role or "user"
    )
    
    return schemas.TokenResponse(
        access_token=auth_response.session.access_token,
        refresh_token=auth_response.session.refresh_token,
        user=build_user_response(profile)
    )

@router.post("/login", response_model=schemas.TokenResponse)
def login(request: schemas.LoginRequest, db :Session = Depends(get_db)):
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
    except Exception as exc:
        raise HTTPException(status_code=401, detail=auth_error_detail(exc))

    if not auth_response.user or not auth_response.session:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    profile = get_or_create_profile(
        db,
        auth_response.user.id,
        auth_response.user.email or request.email,
        auth_response.user.user_metadata
    )
    
    return schemas.TokenResponse(
        access_token=auth_response.session.access_token,
        refresh_token=auth_response.session.refresh_token,
        user=build_user_response(profile)
    )

@router.post("/user")
def add_user(
    request: schemas.RegisterRequest,
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    validate_password_strength(request.password)

    try:
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "name": request.name,
                    "role": request.role or "user"
                }
            }
        })
    except Exception as exc:
        raise HTTPException(status_code=400, detail=auth_error_detail(exc))

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="User creation failed")

    profile = create_or_update_profile(
        db,
        auth_response.user.id,
        auth_response.user.email or request.email,
        request.name,
        request.role or "user"
    )

    return build_user_response(profile)

@router.get("/user",response_model=List[schemas.showUser])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    users=db.query(models.Profile).all()

    return users