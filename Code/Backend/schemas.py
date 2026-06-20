from pydantic import BaseModel
from typing import List,Optional,Dict

class RegisterRequest(BaseModel):
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

class EmployeeCreate(BaseModel): 
    employee_id:str
    first_name:str
    surname:str
    role:Optional[str]=None
    id_number:str
    phone_number:str
    ble_uuid:str

class EmployeeResponse(BaseModel): ##Output
    id:int
    employee_id:str
    first_name:str
    surname:str
    role:str
    id_number:str
    phone_number:str
    ble_uuid:str

    class Config:
        from_attributes=True

class AttendanceCreate(BaseModel): ##Create
    employee_id:str
    attendance:str="Present"

class AttendanceResponse(BaseModel): ##Response
    id:int
    employee_id:str
    attendance:str

    class Config:
        from_attributes=True

class BLEPositionCreate(BaseModel):
    employee_id:str
    x_meters:float
    y_meters:float
    zone:str
    timestamp_epoch:int

class BLEPositionResponse(BaseModel):
    id:int
    employee_id:str
    x_meters:float
    y_meters:float
    zone:str

    class Config:
        from_attributes=True
        
class AssetCreate(BaseModel):
    asset_type:str
    plate:str
    status:str
    location:str  

class AssetResponse(BaseModel):
    id:int
    asset_type:str
    plate:str
    status:str
    location:str

    class Config:
        from_attributes=True

class TelematicsCreate(BaseModel):
    asset_id:int
    fuel_level:float
    odometer_reading:float
    engine_hours:float
    timestamp_epoch:int
    engine_status:str

class TelematicsResponse(BaseModel):
    id:int
    asset_id:int
    fuel_level:float
    odometer_reading:float
    engine_hours:float

    class Config:
        from_attributes=True

class BoundingBox(BaseModel):
    x:float
    y:float
    w:float
    h:float

class DetectionEventCreate(BaseModel):
    camera_id: int
    event_type: str
    confidence: float
    timestamp_epoch: int
    bbox: BoundingBox

class DetectionEventResponse(BaseModel):
    id:int
    camera_id:int
    event_type:str
    confidence:float

    class Config:
        from_attributes=True

class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: showUser
