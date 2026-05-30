from database import Base
from sqlalchemy import Column,String,DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

class Profile(Base):
    __tablename__="profiles"

    id=Column(UUID(as_uuid=True),primary_key=True,index=True)
    name=Column(String,nullable=False)
    role=Column(String,nullable=False,default="user")
    email=Column(String,unique=True,index=True,nullable=False)
    created_at=Column(DateTime,server_default=func.now(),nullable=False)

User = Profile
