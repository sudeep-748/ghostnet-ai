from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.models import RecoveryMission, LostGearReport, DriftPrediction, RecoveryUpdate
from app.schemas.schemas import (
    RecoveryMissionCreate, 
    RecoveryMissionResponse,
    RecoveryUpdateCreate,
    RecoveryUpdateResponse,
    RecoveryUpdateSyncBatch,
    SyncBatchResponse,
    OfflineMissionPackage
)
from app.services.package_bundler import generate_offline_mission_package

router = APIRouter(prefix="/missions", tags=["Recovery Missions"])

@router.post("", response_model=RecoveryMissionResponse, status_code=status.HTTP_201_CREATED)
def create_mission(mission_in: RecoveryMissionCreate, db: Session = Depends(get_db)):
    mission = RecoveryMission(**mission_in.model_dump(), status="planned")
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission

@router.get("", response_model=List[RecoveryMissionResponse])
def list_missions(status_filter: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(RecoveryMission)
    if status_filter:
        query = query.filter(RecoveryMission.status == status_filter)
    return query.order_by(RecoveryMission.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{mission_id}", response_model=RecoveryMissionResponse)
def get_mission(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(RecoveryMission).filter(RecoveryMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission

@router.post("/{mission_id}/offline-package", response_model=OfflineMissionPackage)
def get_mission_offline_package(mission_id: str, db: Session = Depends(get_db)):
    """
    Generates and returns the complete offline mission package for download before vessel departs port.
    """
    mission = db.query(RecoveryMission).filter(RecoveryMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    report = None
    if mission.report_id:
        report = db.query(LostGearReport).filter(LostGearReport.id == mission.report_id).first()
        
    prediction = None
    if mission.prediction_id:
        prediction = db.query(DriftPrediction).filter(DriftPrediction.id == mission.prediction_id).first()
        
    package_data = generate_offline_mission_package(mission, report, prediction)
    return package_data

@router.post("/{mission_id}/updates", response_model=RecoveryUpdateResponse, status_code=status.HTTP_201_CREATED)
def add_recovery_update(mission_id: str, update_in: RecoveryUpdateCreate, db: Session = Depends(get_db)):
    mission = db.query(RecoveryMission).filter(RecoveryMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Idempotency check
    if update_in.client_update_id:
        existing = db.query(RecoveryUpdate).filter(
            RecoveryUpdate.client_update_id == update_in.client_update_id
        ).first()
        if existing:
            return existing

    update_data = update_in.model_dump()
    update_data["mission_id"] = mission_id
    if not update_data.get("timestamp"):
        update_data["timestamp"] = datetime.now(timezone.utc)

    update = RecoveryUpdate(**update_data, sync_status="synced")
    db.add(update)
    
    # Update mission status if net was recovered
    if update.status == "net_recovered":
        mission.status = "completed"
        mission.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(update)
    return update

@router.post("/{mission_id}/sync", response_model=SyncBatchResponse)
def sync_recovery_updates(mission_id: str, batch: RecoveryUpdateSyncBatch, db: Session = Depends(get_db)):
    """
    Batch offline sync for field recovery actions when vessel returns to connectivity.
    """
    synced_ids = []
    for item in batch.updates:
        if item.client_update_id:
            existing = db.query(RecoveryUpdate).filter(
                RecoveryUpdate.client_update_id == item.client_update_id
            ).first()
            if existing:
                synced_ids.append(existing.id)
                continue
                
        data = item.model_dump()
        data["mission_id"] = mission_id
        if not data.get("timestamp"):
            data["timestamp"] = datetime.now(timezone.utc)
            
        update = RecoveryUpdate(**data, sync_status="synced")
        db.add(update)
        db.flush()
        synced_ids.append(update.id)
        
    db.commit()
    return SyncBatchResponse(synced_count=len(synced_ids), synced_ids=synced_ids, failed_count=0)
