from database import Base
from sqlalchemy import Column,Integer,String,ForeignKey,DateTime
from sqlalchemy.sql import func

class User(Base):
    __tablename__="users"

    id=Column(Integer,primary_key=True,index=True)
    name=Column(String)
    role=Column(String)
    email=Column(String)
    password=Column(String)
    created_at=Column(DateTime,server_default=func.now(),nullable=False)

