
import os
from sqlalchemy import text
from fastapi import FastAPI,Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine
import models
import schemas
from routers import users
from database import get_db



App=FastAPI(
    title="CSMS_backend",
    description="This is the heart to the robust CSMS",
    version="1.0.0"
    )

models.Base.metadata.create_all(engine)


@App.get("/health")
def check_health(db :Session =Depends(get_db)):
    result =db.execute(text('SELECT 1'))
    return{"status":"Connected"}

App.include_router(users.router)


