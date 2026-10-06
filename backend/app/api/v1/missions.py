from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.models import RecoveryMission, LostGearReport, DriftPrediction, RecoveryUpdate, User, Boat
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
    team_id_val = mission_in.team_id
    if team_id_val:
        user_match = db.query(User).filter(
            (User.id == team_id_val) | (User.name == team_id_val) | (User.phone == team_id_val)
        ).first()
        if user_match:
            team_id_val = user_match.id

    boat_id_val = mission_in.boat_id
    if boat_id_val:
        boat_match = db.query(Boat).filter(
            (Boat.id == boat_id_val) | (Boat.registration_number == boat_id_val) | (Boat.name == boat_id_val)
        ).first()
        if boat_match:
            boat_id_val = boat_match.id

    report_id_val = mission_in.report_id
    pred_id_val = mission_in.prediction_id
    if report_id_val:
        rep_match = db.query(LostGearReport).filter(
            (LostGearReport.id == report_id_val) | (LostGearReport.client_report_id == report_id_val)
        ).first()
        if rep_match:
            report_id_val = rep_match.id
            if not pred_id_val:
                latest_pred = db.query(DriftPrediction).filter(
                    DriftPrediction.report_id == rep_match.id
                ).order_by(DriftPrediction.generated_at.desc()).first()
                if latest_pred:
                    pred_id_val = latest_pred.id

    mission = RecoveryMission(
        prediction_id=pred_id_val,
        report_id=report_id_val,
        team_id=team_id_val,
        boat_id=boat_id_val,
        status="active",
        search_area_geojson=mission_in.search_area_geojson,
        planned_route_geojson=mission_in.planned_route_geojson,
        started_at=datetime.now(timezone.utc)
    )
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

    # Link report_id and team_id from parent mission if not specified
    if not update_data.get("report_id") and mission.report_id:
        update_data["report_id"] = mission.report_id
    if not update_data.get("team_id") and mission.team_id:
        update_data["team_id"] = mission.team_id
    elif update_data.get("team_id"):
        user_match = db.query(User).filter(
            (User.id == update_data["team_id"]) | (User.name == update_data["team_id"]) | (User.phone == update_data["team_id"])
        ).first()
        if user_match:
            update_data["team_id"] = user_match.id

    update = RecoveryUpdate(**update_data, sync_status="synced")
    db.add(update)
    
    # Update mission status and report status if net was recovered
    if update.status == "net_recovered":
        mission.status = "completed"
        mission.completed_at = datetime.now(timezone.utc)
        if mission.report_id:
            parent_report = db.query(LostGearReport).filter(LostGearReport.id == mission.report_id).first()
            if parent_report:
                parent_report.sync_status = "recovered"

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
