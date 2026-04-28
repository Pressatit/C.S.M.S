from sqlalchemy import text
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, get_db

import models

from routers import users
from routers import employees
from routers import attendance
from routers import assets
from routers import telematics
from routers import detections
from routers import ble_positions


app = FastAPI(
    title="CSMS_backend",
    description="This is the heart of the robust CSMS",
    version="1.0.0"
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create tables
models.Base.metadata.create_all(bind=engine)


@app.get("/health")
def check_health(
    db: Session = Depends(get_db)
):
    db.execute(text("SELECT 1"))
    return {"status": "Connected"}


# Routers
app.include_router(users.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(assets.router)
app.include_router(telematics.router)
app.include_router(detections.router)
app.include_router(ble_positions.router)