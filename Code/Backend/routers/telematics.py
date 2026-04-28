from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session

import models
import schemas

from database import get_db

router=APIRouter(
 prefix="/telematics",
 tags=["Telematics"]
)

@router.post("/")
def create_telematics(
    request:schemas.TelematicsCreate,
    db:Session=Depends(get_db)
):
 asset=db.query(
   models.Asset
 ).filter(
   models.Asset.id==request.asset_id
 ).first()

 if not asset:
    raise HTTPException(
      status_code=404,
      detail="Asset not found"
    )
 telemetry=models.TelematicsData(
   asset_id=request.asset_id,
   fuel_level=request.fuel_level,
   odometer_reading=request.odometer_reading,
   engine_hours=request.engine_hours,
   timestamp_epoch=request.timestamp_epoch,
   engine_status=request.engine_status
 )

 db.add(telemetry)
 db.commit()
 db.refresh(telemetry)

 return telemetry

@router.get("/")
def get_telematics(
 db:Session=Depends(get_db)
):
 return db.query(
   models.TelematicsData
 ).all()

@router.get("/asset/{asset_id}")
def get_asset_telematics(
 asset_id:int,
 db:Session=Depends(get_db)
):

 return db.query(
   models.TelematicsData
 ).filter(
   models.TelematicsData.asset_id==asset_id
 ).all()