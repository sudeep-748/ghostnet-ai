from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ================= AUTH SCHEMAS =================
class UserBase(BaseModel):
    name: str
    phone: str
    role: str = "fisher"  # fisher | recovery_team | admin | recycler
    boat_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    phone: str
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ================= BOAT SCHEMAS =================
class BoatBase(BaseModel):
    name: str
    registration_number: str
    harbour: str = "Kasimedu"
    owner_id: Optional[str] = None

class BoatCreate(BoatBase):
    pass

class BoatResponse(BoatBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ================= GEAR SCHEMAS =================
class GearBase(BaseModel):
    gear_type: str = "gillnet"
    material: str = "nylon"
    weight_kg: float = 12.5
    owner_id: Optional[str] = None
    boat_id: Optional[str] = None
    qr_code: Optional[str] = None

class GearCreate(GearBase):
    pass

class GearResponse(GearBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ================= LOST GEAR REPORT SCHEMAS =================
class LostGearReportCreate(BaseModel):
    client_report_id: Optional[str] = None
    gear_id: Optional[str] = None
    reported_by: Optional[str] = None
    boat_id: Optional[str] = None
    loss_latitude: float = Field(..., ge=-90.0, le=90.0)
    loss_longitude: float = Field(..., ge=-180.0, le=180.0)
    loss_time: Optional[datetime] = None
    gear_type: str = "gillnet"
    material: str = "nylon"
    estimated_quantity: int = 1
    photo_url: Optional[str] = None
    sea_condition: str = "moderate"
    notes: Optional[str] = None
    threat_level: Optional[str] = "CRITICAL"
    wildlife_flag: Optional[bool] = False
    loss_depth_m: Optional[int] = None
    estimated_weight_kg: Optional[float] = None

class LostGearReportSyncBatch(BaseModel):
    reports: List[LostGearReportCreate]

class LostGearReportResponse(BaseModel):
    id: str
    client_report_id: Optional[str] = None
    gear_id: Optional[str] = None
    reported_by: Optional[str] = None
    boat_id: Optional[str] = None
    loss_latitude: float
    loss_longitude: float
    loss_time: datetime
    gear_type: str
    material: str
    estimated_quantity: int
    photo_url: Optional[str] = None
    sea_condition: str
    notes: Optional[str] = None
    sync_status: str
    loss_depth_m: Optional[int] = None
    estimated_weight_kg: Optional[float] = None
    threat_level: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SyncBatchResponse(BaseModel):
    synced_count: int
    synced_ids: List[str]
    failed_count: int = 0


# ================= DRIFT PREDICTION SCHEMAS =================
class DriftPredictionGenerate(BaseModel):
    report_id: str
    forecast_hours: int = 72
    particles: int = 5000

class DriftPredictionResponse(BaseModel):
    id: str
    report_id: str
    generated_at: datetime
    forecast_hours: int
    particles: int
    heatmap_geojson: Optional[Dict[str, Any]] = None
    predicted_path_geojson: Optional[Dict[str, Any]] = None
    high_risk_zones_geojson: Optional[Dict[str, Any]] = None
    confidence_score: float
    model_version: str
    status: str

    class Config:
        from_attributes = True


# ================= RECOVERY MISSION SCHEMAS =================
class RecoveryMissionCreate(BaseModel):
    prediction_id: Optional[str] = None
    report_id: Optional[str] = None
    team_id: Optional[str] = None
    boat_id: Optional[str] = None
    search_area_geojson: Optional[Dict[str, Any]] = None
    planned_route_geojson: Optional[Dict[str, Any]] = None

class RecoveryMissionResponse(BaseModel):
    id: str
    prediction_id: Optional[str] = None
    report_id: Optional[str] = None
    team_id: Optional[str] = None
    boat_id: Optional[str] = None
    team_name: Optional[str] = None
    boat_name: Optional[str] = None
    status: str
    search_area_geojson: Optional[Dict[str, Any]] = None
    planned_route_geojson: Optional[Dict[str, Any]] = None
    offline_package_url: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OfflineMissionPackage(BaseModel):
    mission_id: str
    report_id: Optional[str] = None
    prediction_id: Optional[str] = None
    offline_map_bbox: List[float] = [80.10, 12.90, 80.45, 13.25]
    offline_map_zoom_levels: List[int] = [8, 9, 10, 11, 12, 13]
    drift_heatmap_geojson: Optional[Dict[str, Any]] = None
    recommended_route_geojson: Optional[Dict[str, Any]] = None
    high_risk_zones_geojson: Optional[Dict[str, Any]] = None
    reported_loss_point: Dict[str, float]
    weather_snapshot: Dict[str, Any]
    generated_at: datetime


# ================= RECOVERY UPDATE SCHEMAS =================
class RecoveryUpdateCreate(BaseModel):
    client_update_id: Optional[str] = None
    mission_id: Optional[str] = None
    report_id: Optional[str] = None
    team_id: Optional[str] = None
    status: str = "net_recovered"
    latitude: float
    longitude: float
    timestamp: Optional[datetime] = None
    photo_url: Optional[str] = None
    weight_kg: float = 10.0
    notes: Optional[str] = None

class RecoveryUpdateSyncBatch(BaseModel):
    updates: List[RecoveryUpdateCreate]

class RecoveryUpdateResponse(BaseModel):
    id: str
    client_update_id: Optional[str] = None
    mission_id: Optional[str] = None
    report_id: Optional[str] = None
    team_id: Optional[str] = None
    status: str
    latitude: float
    longitude: float
    timestamp: datetime
    photo_url: Optional[str] = None
    weight_kg: float
    notes: Optional[str] = None
    sync_status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ================= RECYCLER ASSIGNMENT SCHEMAS =================
class RecyclerAssignmentCreate(BaseModel):
    recovery_update_id: str
    recycler_id: Optional[str] = None
    material_type: str = "nylon"
    weight_kg: float = 10.0

class RecyclerAssignmentUpdate(BaseModel):
    status: str  # pending | collected | processed

class RecyclerAssignmentResponse(BaseModel):
    id: str
    recovery_update_id: str
    recycler_id: Optional[str] = None
    material_type: str
    weight_kg: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ================= IMPACT ANALYTICS SCHEMAS =================
class ImpactMetricsResponse(BaseModel):
    total_reports: int
    active_missions: int
    completed_missions: int
    total_recovered_kg: float
    total_nets_removed: int
    estimated_animals_protected: int
    co2e_avoided_kg: float
    recycled_material_kg: float
    offline_reports_synced: int
    recovery_success_rate_percent: float
    avg_recovery_time_hours: float
