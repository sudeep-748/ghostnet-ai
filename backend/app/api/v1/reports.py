from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.models import LostGearReport, User, Boat
from app.schemas.schemas import (
    LostGearReportCreate, 
    LostGearReportResponse, 
    LostGearReportSyncBatch,
    SyncBatchResponse
)

router = APIRouter(prefix="/reports", tags=["Lost Gear Reports"])

@router.post("", response_model=LostGearReportResponse, status_code=status.HTTP_201_CREATED)
@router.post("/lost-gear", response_model=LostGearReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(report_in: LostGearReportCreate, db: Session = Depends(get_db)):
    client_id = report_in.client_report_id or report_in.id

    # Check idempotency if client_report_id or id is provided
    if client_id:
        existing = db.query(LostGearReport).filter(
            (LostGearReport.client_report_id == client_id) | (LostGearReport.id == client_id)
        ).first()
        if existing:
            return existing

    report_data = report_in.model_dump()
    
    # Resolve coordinates
    lat = report_data.get("loss_latitude") or report_data.get("latitude") or 13.1122
    lon = report_data.get("loss_longitude") or report_data.get("longitude") or 80.2937
    
    # Safely compile notes
    depth = report_data.get("loss_depth_m")
    weight = report_data.get("estimated_weight_kg")
    threat = report_data.get("threat_level")
    raw_notes = str(report_data.get("notes") or "")
    notes_parts = []
    if raw_notes:
        notes_parts.append(raw_notes)
    if depth is not None and "Depth:" not in raw_notes:
        notes_parts.append(f"Depth: {depth}m")
    if weight is not None and "Weight:" not in raw_notes:
        notes_parts.append(f"Weight: {weight}kg")
    if threat and "Threat:" not in raw_notes:
        notes_parts.append(f"Threat: {threat}")
    combined_notes = " • ".join(notes_parts) if notes_parts else None

    # Resolve reported_by User and boat_id Boat so they are never NULL
    reported_by_id = report_data.get("reported_by")
    boat_id_val = report_data.get("boat_id")

    if not reported_by_id and combined_notes and "Reported by " in combined_notes:
        reporter_name = combined_notes.split("Reported by ")[1].split(" (")[0].strip()
        user_match = db.query(User).filter(User.name == reporter_name).first()
        if user_match:
            reported_by_id = user_match.id
            if not boat_id_val and user_match.boat_id:
                boat_id_val = user_match.boat_id

    if boat_id_val:
        boat_obj = db.query(Boat).filter(
            (Boat.id == boat_id_val) | (Boat.registration_number == boat_id_val)
        ).first()
        if boat_obj:
            boat_id_val = boat_obj.id

    loss_time = report_data.get("loss_time") or datetime.now(timezone.utc)

    report = LostGearReport(
        client_report_id=client_id,
        gear_id=report_data.get("gear_id"),
        reported_by=reported_by_id,
        boat_id=boat_id_val,
        loss_latitude=float(lat),
        loss_longitude=float(lon),
        loss_time=loss_time,
        gear_type=report_data.get("gear_type") or "gillnet",
        material=report_data.get("material") or "nylon",
        estimated_quantity=report_data.get("estimated_quantity") or 1,
        photo_url=report_data.get("photo_url"),
        sea_condition=report_data.get("sea_condition") or "moderate",
        notes=combined_notes,
        sync_status="synced"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Automatically generate Lagrangian drift trajectory prediction & heatmap!
    try:
        from app.api.v1.predictions import generate_prediction_for_report
        generate_prediction_for_report(report, db)
    except Exception as e:
        print(f"Auto drift prediction note: {e}")

    return report

@router.get("/lost-gear", response_model=List[LostGearReportResponse])
def list_reports(status_filter: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(LostGearReport)
    if status_filter:
        query = query.filter(LostGearReport.sync_status == status_filter)
    return query.order_by(LostGearReport.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/lost-gear/{report_id}", response_model=LostGearReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(LostGearReport).filter(LostGearReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.post("/sync", response_model=SyncBatchResponse)
def sync_reports(batch: LostGearReportSyncBatch, db: Session = Depends(get_db)):
    """
    Idempotent offline sync endpoint. Ingests queued reports from mobile devices
    preventing duplicate inserts using client_report_id.
    """
    synced_ids = []
    
    for item in batch.reports:
        # Check if already exists by client_report_id
        if item.client_report_id:
            existing = db.query(LostGearReport).filter(
                LostGearReport.client_report_id == item.client_report_id
            ).first()
            if existing:
                synced_ids.append(existing.id)
                continue
                
        report_data = item.model_dump()
        lat = report_data.get("loss_latitude") or report_data.get("latitude") or 13.1122
        lon = report_data.get("loss_longitude") or report_data.get("longitude") or 80.2937
        loss_time = report_data.get("loss_time") or datetime.now(timezone.utc)
            
        new_report = LostGearReport(
            client_report_id=item.client_report_id or item.id,
            gear_id=report_data.get("gear_id"),
            reported_by=report_data.get("reported_by"),
            boat_id=report_data.get("boat_id"),
            loss_latitude=float(lat),
            loss_longitude=float(lon),
            loss_time=loss_time,
            gear_type=report_data.get("gear_type") or "gillnet",
            material=report_data.get("material") or "nylon",
            estimated_quantity=report_data.get("estimated_quantity") or 1,
            photo_url=report_data.get("photo_url"),
            sea_condition=report_data.get("sea_condition") or "moderate",
            notes=report_data.get("notes"),
            sync_status="synced"
        )
        db.add(new_report)
        db.flush()
        synced_ids.append(new_report.id)
        
    db.commit()
    return SyncBatchResponse(
        synced_count=len(synced_ids),
        synced_ids=synced_ids,
        failed_count=0
    )
