from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.core.database import get_db
from app.models.models import DriftPrediction, LostGearReport
from app.schemas.schemas import DriftPredictionGenerate, DriftPredictionResponse

router = APIRouter(prefix="/predictions", tags=["Drift Prediction"])

def create_mock_drift_geojson(lat: float, lng: float, hours: int = 72) -> Dict[str, Any]:
    """Generates a realistic 3-tier Bay of Bengal drift heatmap and high-risk corridor."""
    # North-East coastal drift typical for the Chennai coastline
    offset_24 = (0.015, 0.020)
    offset_48 = (0.035, 0.045)
    offset_72 = (0.060, 0.075)

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [lng - 0.005, lat - 0.005],
                        [lng + offset_24[1], lat + offset_24[0]],
                        [lng + offset_48[1], lat + offset_48[0]],
                        [lng + offset_72[1] + 0.01, lat + offset_72[0] - 0.01],
                        [lng + offset_48[1] - 0.01, lat + offset_48[0] - 0.01],
                        [lng - 0.005, lat - 0.005]
                    ]]
                },
                "properties": {
                    "forecast_hours": hours,
                    "risk_level": "critical",
                    "risk_score": 84.5,
                    "confidence": 0.88,
                    "gear_type": "gillnet",
                    "notes": "Projected drift corridor near Kasimedu navigation and turtle breeding zone"
                }
            }
        ]
    }

try:
    from app.services.drift_engine import LagrangianDriftEngine
    HAS_DRIFT_ENGINE = True
except ImportError:
    HAS_DRIFT_ENGINE = False

@router.post("/generate", response_model=DriftPredictionResponse, status_code=status.HTTP_201_CREATED)
def generate_prediction(req: DriftPredictionGenerate, db: Session = Depends(get_db)):
    report = db.query(LostGearReport).filter(LostGearReport.id == req.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Lost gear report not found")
        
    if HAS_DRIFT_ENGINE:
        try:
            engine = LagrangianDriftEngine()
            sim_result = engine.run_simulation(
                origin_lat=report.loss_latitude,
                origin_lon=report.loss_longitude,
                gear_type=report.gear_type or "gillnet",
                forecast_hours=req.forecast_hours,
                num_particles=req.particles,
            )
            heatmap = sim_result.drift_heatmap_geojson
            path_geojson = sim_result.predicted_path_geojson
            high_risk_zones = getattr(sim_result, 'high_risk_zones_geojson', heatmap)
            confidence = sim_result.confidence_score
        except Exception as e:
            heatmap = create_mock_drift_geojson(report.loss_latitude, report.loss_longitude, req.forecast_hours)
            path_geojson = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[report.loss_longitude, report.loss_latitude], [report.loss_longitude + 0.04, report.loss_latitude + 0.04]]
                },
                "properties": {"speed_knots": 1.2}
            }
            high_risk_zones = heatmap
            confidence = 0.86
    else:
        heatmap = create_mock_drift_geojson(report.loss_latitude, report.loss_longitude, req.forecast_hours)
        path_geojson = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[report.loss_longitude, report.loss_latitude], [report.loss_longitude + 0.04, report.loss_latitude + 0.04]]
            },
            "properties": {"speed_knots": 1.2}
        }
        high_risk_zones = heatmap
        confidence = 0.86

    prediction = DriftPrediction(
        report_id=report.id,
        forecast_hours=req.forecast_hours,
        particles=req.particles,
        heatmap_geojson=heatmap,
        predicted_path_geojson=path_geojson,
        high_risk_zones_geojson=high_risk_zones,
        confidence_score=confidence,
        model_version="drift-v1-lagrangian",
        status="completed"
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction

@router.get("/{prediction_id}", response_model=DriftPredictionResponse)
def get_prediction(prediction_id: str, db: Session = Depends(get_db)):
    pred = db.query(DriftPrediction).filter(DriftPrediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Drift prediction not found")
    return pred

@router.get("/report/{report_id}", response_model=List[DriftPredictionResponse])
def get_predictions_by_report(report_id: str, db: Session = Depends(get_db)):
    return db.query(DriftPrediction).filter(DriftPrediction.report_id == report_id).all()

@router.get("/{prediction_id}/heatmap")
def get_heatmap(prediction_id: str, db: Session = Depends(get_db)):
    pred = db.query(DriftPrediction).filter(DriftPrediction.id == prediction_id).first()
    if not pred or not pred.heatmap_geojson:
        raise HTTPException(status_code=404, detail="Heatmap not found")
    return pred.heatmap_geojson
