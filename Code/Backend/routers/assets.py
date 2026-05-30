from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/assets",
    tags=["Assets"]
)


@router.post("/")
def create_asset(
    request: schemas.AssetCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(
        models.Asset
    ).filter(
        models.Asset.plate == request.plate
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Asset already exists"
        )

    asset = models.Asset(
        asset_type=request.asset_type,
        plate=request.plate,
        status=request.status,
        location=request.location
    )

    db.add(asset)
    db.commit()
    db.refresh(asset)

    return asset


@router.get("/")
def get_assets(
    db: Session = Depends(get_db)
):
    return db.query(
        models.Asset
    ).all()


@router.get("/{id}")
def get_asset(
    id: int,
    db: Session = Depends(get_db)
):
    asset = db.query(
        models.Asset
    ).filter(
        models.Asset.id == id
    ).first()

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )
    return asset

@router.put("/{id}")
def update_asset(
    id: int,
    request: schemas.AssetCreate,
    db: Session = Depends(get_db)
):
    asset = db.query(
        models.Asset
    ).filter(
        models.Asset.id == id
    ).first()

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )
     # Check if another asset already uses this plate
    duplicate_plate = db.query(
        models.Asset
    ).filter(
        models.Asset.plate == request.plate,
        models.Asset.id != id
    ).first()

    if duplicate_plate:
        raise HTTPException(
            status_code=400,
            detail="Plate already assigned to another asset"
        )

    asset.asset_type = request.asset_type
    asset.plate = request.plate
    asset.status = request.status
    asset.location = request.location

    db.commit()
    db.refresh(asset)

    return asset


@router.delete("/{id}")
def delete_asset(
    id: int,
    db: Session = Depends(get_db)
):
    asset = db.query(
        models.Asset
    ).filter(
        models.Asset.id == id
    ).first()

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    db.delete(asset)
    db.commit()

    return {
        "message": "Asset deleted"
    }