from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Gear
from app.schemas.schemas import GearCreate, GearResponse

router = APIRouter(prefix="/gear", tags=["Gear Registry"])

@router.post("", response_model=GearResponse, status_code=status.HTTP_201_CREATED)
def create_gear(gear_in: GearCreate, db: Session = Depends(get_db)):
    gear = Gear(**gear_in.model_dump())
    db.add(gear)
    db.commit()
    db.refresh(gear)
    return gear

@router.get("", response_model=List[GearResponse])
def list_gear(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Gear).offset(skip).limit(limit).all()

@router.get("/{gear_id}", response_model=GearResponse)
def get_gear(gear_id: str, db: Session = Depends(get_db)):
    gear = db.query(Gear).filter(Gear.id == gear_id).first()
    if not gear:
        raise HTTPException(status_code=404, detail="Gear not found")
    return gear
