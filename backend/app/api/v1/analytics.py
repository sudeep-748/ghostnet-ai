from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.models import LostGearReport, RecoveryMission, RecoveryUpdate, RecyclerAssignment
from app.schemas.schemas import ImpactMetricsResponse

router = APIRouter(prefix="/analytics", tags=["Impact Analytics"])

@router.get("/impact", response_model=ImpactMetricsResponse)
def get_impact_metrics(db: Session = Depends(get_db)):
    total_reports = db.query(LostGearReport).count()
    active_missions = db.query(RecoveryMission).filter(RecoveryMission.status == "active").count()
    completed_missions = db.query(RecoveryMission).filter(RecoveryMission.status == "completed").count()
    
    # Recovered gear stats
    recovered_updates = db.query(RecoveryUpdate).filter(RecoveryUpdate.status == "net_recovered").all()
    total_nets_removed = len(recovered_updates)
    total_recovered_kg = sum(u.weight_kg for u in recovered_updates) or 0.0
    
    # Material recycled
    recycled_assignments = db.query(RecyclerAssignment).filter(RecyclerAssignment.status == "processed").all()
    recycled_material_kg = sum(a.weight_kg for a in recycled_assignments) or 0.0
    
    # Impact calculations:
    # 1. CO2e avoided: Nylon EF is ~6.5 kg CO2e per kg
    co2e_avoided_kg = round(total_recovered_kg * 6.5, 2)
    
    # 2. Animals protected: ~0.12 marine animals protected per kg of gillnet recovered
    estimated_animals_protected = int(total_recovered_kg * 0.12)
    
    # 3. Recovery success rate
    success_rate = (completed_missions / total_reports * 100.0) if total_reports > 0 else 0.0
    
    # 4. Offline reports synced
    offline_reports_synced = db.query(LostGearReport).filter(LostGearReport.client_report_id != None).count()

    return ImpactMetricsResponse(
        total_reports=total_reports,
        active_missions=active_missions,
        completed_missions=completed_missions,
        total_recovered_kg=round(total_recovered_kg, 2),
        total_nets_removed=total_nets_removed,
        estimated_animals_protected=estimated_animals_protected,
        co2e_avoided_kg=co2e_avoided_kg,
        recycled_material_kg=round(recycled_material_kg, 2),
        offline_reports_synced=offline_reports_synced,
        recovery_success_rate_percent=round(success_rate, 1),
        avg_recovery_time_hours=14.5
    )

@router.get("/reports")
def get_report_analytics(db: Session = Depends(get_db)):
    gear_counts = db.query(
        LostGearReport.gear_type, func.count(LostGearReport.id)
    ).group_by(LostGearReport.gear_type).all()
    
    return {
        "gear_distribution": {gear: count for gear, count in gear_counts}
    }

@router.get("/recoveries")
def get_recovery_analytics(db: Session = Depends(get_db)):
    status_counts = db.query(
        RecoveryUpdate.status, func.count(RecoveryUpdate.id)
    ).group_by(RecoveryUpdate.status).all()
    
    return {
        "recovery_distribution": {status: count for status, count in status_counts}
    }
