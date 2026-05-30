from pydantic import BaseModel
from typing import Optional

class users(BaseModel):
    name: str
    role: Optional[str]
    email: str
    password: str

class showUser(BaseModel):
    id:str
    name:str
    role:str
    email:str
    

    class Config:
        from_attributes=True

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: showUser
