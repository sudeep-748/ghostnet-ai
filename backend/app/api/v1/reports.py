from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.models import LostGearReport
from app.schemas.schemas import (
    LostGearReportCreate, 
    LostGearReportResponse, 
    LostGearReportSyncBatch,
    SyncBatchResponse
)

router = APIRouter(prefix="/reports", tags=["Lost Gear Reports"])

@router.post("/lost-gear", response_model=LostGearReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(report_in: LostGearReportCreate, db: Session = Depends(get_db)):
    # Check idempotency if client_report_id is provided
    if report_in.client_report_id:
        existing = db.query(LostGearReport).filter(
            LostGearReport.client_report_id == report_in.client_report_id
        ).first()
        if existing:
            return existing

    report_data = report_in.model_dump()
    if not report_data.get("loss_time"):
        report_data["loss_time"] = datetime.now(timezone.utc)
        
    report = LostGearReport(**report_data, sync_status="synced")
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.get("/lost-gear", response_model=List[LostGearReportResponse])
def list_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(LostGearReport).order_by(LostGearReport.created_at.desc()).offset(skip).limit(limit).all()

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
        if not report_data.get("loss_time"):
            report_data["loss_time"] = datetime.now(timezone.utc)
            
        new_report = LostGearReport(**report_data, sync_status="synced")
        db.add(new_report)
        db.flush()
        synced_ids.append(new_report.id)
        
    db.commit()
    return SyncBatchResponse(
        synced_count=len(synced_ids),
        synced_ids=synced_ids,
        failed_count=0
    )
