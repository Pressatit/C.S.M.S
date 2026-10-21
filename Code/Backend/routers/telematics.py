from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user
from datetime import datetime,date
from sqlalchemy import func

router = APIRouter(
    prefix="/telematics",
    tags=["Telematics"]
)

@router.post("/")
def create_telematics(
    request: schemas.TelematicsCreate,
    db: Session = Depends(get_db),
    #current_user: models.Profile = Depends(get_current_user)
):
    asset = db.query(
        models.Asset
    ).filter(
        models.Asset.id == request.asset_id
    ).first()

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )
    telemetry = models.TelematicsData(
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

@router.get("/{asset_id}")
def get_single_asset_telematics( asset_id:int,db: Session = Depends(get_db),query_date:str=None,
                                 #current_user: models.Profile = Depends(get_current_user)
                                ):

    info=db.query(models.Asset).filter(models.Asset.id==asset_id).first()

    if not info:
        raise HTTPException(status_code=404, detail="Asset not found")

    if query_date:
        target_date=datetime.strptime(query_date,"%Y-%m-%d").date()
    else:
        target_date=date.today()

    date_str=target_date.strftime("%Y-%m-%d")



    rows=db.query(models.TelematicsData
                  ).filter(models.TelematicsData.asset_id==asset_id,
                        (func.date(models.TelematicsData.added_at))==date_str
                            ).order_by(models.TelematicsData.added_at.asc()
                                       ).all()

    history=[]
    first_odometer_reading=rows[0].odometer_reading if rows else 0

    for row in rows:
        if isinstance(row.added_at,str):
            time=datetime.strptime(row.added_at,"%Y-%m-%d %H:%M:%S")
        else:
            time=row.added_at

        time_str=time.strftime("%H:%M")

        distance_covered=round(row.odometer_reading-first_odometer_reading,1)

        fuel=round(row.fuel_level,1)

        history.append({
            "time":time_str,
            "fuel":fuel,
            "distance":distance_covered
        })

    latest_row =rows[-1] if rows else None

    latest={
            "engine_status":latest_row.engine_status if latest_row else "Off",
            "fuel_level":latest_row.fuel_level if latest_row else 0,
            "burn_rate":latest_row.fuel_consumption_rate if latest_row else 0.0,
            "distance":round(latest_row.odometer_reading-first_odometer_reading,1) if latest_row else 0,
            "engine_hours":latest_row.engine_hours if latest_row else 0
        }
    
    asset={
        "id":info.id,
        "name":info.name,
        "plate":info.plate,
        "asset_type":info.asset_type,
        "location":info.location,
        "device_imei":info.device_imei,
        "status":latest["engine_status"]
    }

    return {
        "asset":asset,
        "latest":latest,
        "history":history
    }

@router.get("/")
def get_all_asset_telematics(query_date: str = None, db: Session = Depends(get_db)):
    
    if query_date:
        target_date = datetime.strptime(query_date, "%Y-%m-%d").date()
    else:
        target_date = date.today()
    date_str = target_date.strftime("%Y-%m-%d")

    
    assets = db.query(models.Asset).all()
    if not assets:
        return []

   
    # Indexing models.TelematicsData.added_at and asset_id in DB is highly recommended
    all_rows = db.query(models.TelematicsData).filter(
        func.date(models.TelematicsData.added_at) == date_str
    ).order_by(models.TelematicsData.asset_id, models.TelematicsData.added_at.asc()).all()

    
    from collections import defaultdict
    telematics_by_asset = defaultdict(list)
    for row in all_rows:
        telematics_by_asset[row.asset_id].append(row)

    payloads = []

    
    for asset in assets:
        rows = telematics_by_asset[asset.id]
        
        history = []
        first_odometer_reading = rows[0].odometer_reading if rows else 0

        for row in rows:
            time = datetime.strptime(row.added_at, "%Y-%m-%d %H:%M:%S") if isinstance(row.added_at, str) else row.added_at
            history.append({
                "time": time.strftime("%H:%M"),
                "fuel": round(row.fuel_level, 1),
                "distance": round(row.odometer_reading - first_odometer_reading, 1)
            })

        latest_row = rows[-1] if rows else None
        latest = {
            "engine_status": latest_row.engine_status if latest_row else "Off",
            "fuel_level": latest_row.fuel_level if latest_row else 0,
            "burn_rate": latest_row.fuel_consumption_rate if latest_row else 0.0,
            "distance": round(latest_row.odometer_reading - first_odometer_reading, 1) if latest_row else 0,
            "engine_hours": latest_row.engine_hours if latest_row else 0
        }
        
        payloads.append({
            "asset": {
                "id": asset.id,
                "name": asset.name,
                "plate": asset.plate,
                "asset_type": asset.asset_type,
                "location": asset.location,
                "device_imei": asset.device_imei,
                "status": latest["engine_status"]
            },
            "latest": latest,
            "history": history
        })

    return payloads

