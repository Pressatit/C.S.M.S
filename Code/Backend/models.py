from database import Base
from sqlalchemy import Column,Integer,String,Float,ForeignKey,DateTime,Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship


class Profile(Base):
    __tablename__="profiles"

    id=Column(UUID(as_uuid=True),primary_key=True,index=True)
    name=Column(String,nullable=False)
    role=Column(String,nullable=False,default="user")
    email=Column(String,unique=True,index=True,nullable=False)
    created_at=Column(DateTime,server_default=func.now(),nullable=False)

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String,unique=True,nullable=False)
    first_name = Column(String,nullable=False)
    surname = Column(String,nullable=False)
    role = Column(String)
    id_number = Column(String,unique=True)
    phone_number = Column(String)
    ble_uuid = Column(String,unique=True)
    created_at = Column(DateTime,server_default=func.now(),nullable=False)
    
    
    attendance_records = relationship(
         "AttendanceRecord",
        backref="employee"
    )

    positions = relationship(
        "BLEPosition",
        backref="employee"
    )

class AttendanceRecord(Base):
    __tablename__="attendance_records"

    id=Column(Integer, primary_key=True, index=True)
    employee_id=Column(String,ForeignKey("employees.employee_id"),  nullable=False)
    time_in = Column(DateTime)
    time_out = Column(DateTime)
    attendance = Column(String,default="Present")
    created_at = Column(DateTime,server_default=func.now())

class BLEPosition(Base):
    __tablename__="ble_positions"

    id = Column(Integer, primary_key=True)
    employee_id = Column(String,ForeignKey("employees.employee_id" ))
    x_meters = Column(Float)
    y_meters = Column(Float)
    zone = Column(String)
    timestamp_epoch = Column(Integer)

class Asset(Base):
    __tablename__="assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_type = Column(String)
    plate = Column(String, unique=True)
    status = Column(String, default="off")
    location = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    
    telematics = relationship(
        "TelematicsData",
        backref="asset"
    )

class TelematicsData(Base):
    __tablename__="telematics_data"

    id = Column( Integer, primary_key=True)
    asset_id = Column(Integer,ForeignKey("assets.id"))
    fuel_level = Column(Float)
    odometer_reading = Column(Float)
    engine_hours = Column(Float)
    timestamp_epoch = Column(Integer)
    engine_status = Column(String)

class DetectionEvent(Base):
    __tablename__="detection_events"

    id = Column(Integer,primary_key=True)
    camera_id = Column(Integer)
    event_type = Column(String)
    confidence = Column(Float)
    timestamp_epoch = Column(Integer)
    timestamp_clock = Column(Integer)
    session_start_epoch = Column(Integer)
    bbox = Column(JSONB)

class Recording(Base):
    __tablename__="recordings"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size_mb = Column(Float)
    duration_secs = Column(Integer)
    codec = Column(String, default="h265")
    video_format = Column("format",String, default="mp4")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
