from pydantic import BaseModel
from typing import List,Optional

class users(BaseModel):
    name: str
    role: Optional[str]
    email: str
    password: str

class showUser(BaseModel):
    id:int
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
    user: showUser