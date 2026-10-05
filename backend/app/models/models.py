import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), default="fisher")  # fisher | recovery_team | admin | recycler
    boat_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    reports = relationship("LostGearReport", back_populates="reporter")
    missions = relationship("RecoveryMission", back_populates="team")
    recycling_assignments = relationship("RecyclerAssignment", back_populates="recycler")


class Boat(Base):
    __tablename__ = "boats"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    registration_number = Column(String(50), unique=True, index=True, nullable=False)
    harbour = Column(String(100), default="Kasimedu")
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Gear(Base):
    __tablename__ = "gear"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    gear_type = Column(String(50), nullable=False)  # gillnet | trawl_net | trap | longline | rope | buoy
    material = Column(String(50), default="nylon")  # nylon | polyethylene | mixed
    weight_kg = Column(Float, default=10.0)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    boat_id = Column(String(36), ForeignKey("boats.id"), nullable=True)
    qr_code = Column(String(100), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class LostGearReport(Base):
    __tablename__ = "lost_gear_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_report_id = Column(String(64), unique=True, index=True, nullable=True)  # Idempotent mobile UUID
    gear_id = Column(String(36), ForeignKey("gear.id"), nullable=True)
    reported_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    boat_id = Column(String(36), ForeignKey("boats.id"), nullable=True)
    
    # Location and Time
    loss_latitude = Column(Float, nullable=False)
    loss_longitude = Column(Float, nullable=False)
    loss_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Gear Characteristics
    gear_type = Column(String(50), default="gillnet")
    material = Column(String(50), default="nylon")
    estimated_quantity = Column(Integer, default=1)
    photo_url = Column(Text, nullable=True)
    sea_condition = Column(String(50), default="moderate")
    notes = Column(Text, nullable=True)
    sync_status = Column(String(20), default="synced")  # pending | synced
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    reporter = relationship("User", back_populates="reports")
    predictions = relationship("DriftPrediction", back_populates="report", cascade="all, delete-orphan")


class DriftPrediction(Base):
    __tablename__ = "drift_predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("lost_gear_reports.id"), nullable=False)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    forecast_hours = Column(Integer, default=72)
    particles = Column(Integer, default=5000)
    
    # GeoJSON Spatial Fields
    heatmap_geojson = Column(JSON, nullable=True)
    predicted_path_geojson = Column(JSON, nullable=True)
    high_risk_zones_geojson = Column(JSON, nullable=True)
    
    confidence_score = Column(Float, default=0.85)
    model_version = Column(String(50), default="drift-v1")
    status = Column(String(20), default="completed")  # processing | completed | failed

    # Relationships
    report = relationship("LostGearReport", back_populates="predictions")
    missions = relationship("RecoveryMission", back_populates="prediction")


class RecoveryMission(Base):
    __tablename__ = "recovery_missions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    prediction_id = Column(String(36), ForeignKey("drift_predictions.id"), nullable=True)
    report_id = Column(String(36), ForeignKey("lost_gear_reports.id"), nullable=True)
    team_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    boat_id = Column(String(36), ForeignKey("boats.id"), nullable=True)
    status = Column(String(30), default="planned")  # planned | active | completed | cancelled
    
    # Spatial navigation data
    search_area_geojson = Column(JSON, nullable=True)
    planned_route_geojson = Column(JSON, nullable=True)
    offline_package_url = Column(Text, nullable=True)
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    prediction = relationship("DriftPrediction", back_populates="missions")
    team = relationship("User", back_populates="missions")
    updates = relationship("RecoveryUpdate", back_populates="mission")


class RecoveryUpdate(Base):
    __tablename__ = "recovery_updates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_update_id = Column(String(64), unique=True, index=True, nullable=True)
    mission_id = Column(String(36), ForeignKey("recovery_missions.id"), nullable=True)
    report_id = Column(String(36), ForeignKey("lost_gear_reports.id"), nullable=True)
    team_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    status = Column(String(40), default="net_recovered")  # net_spotted | net_recovered | not_found | animal_entangled
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    photo_url = Column(Text, nullable=True)
    weight_kg = Column(Float, default=10.0)
    notes = Column(Text, nullable=True)
    sync_status = Column(String(20), default="synced")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    mission = relationship("RecoveryMission", back_populates="updates")
    recycling_assignment = relationship("RecyclerAssignment", back_populates="recovery_update", uselist=False)


class RecyclerAssignment(Base):
    __tablename__ = "recycler_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recovery_update_id = Column(String(36), ForeignKey("recovery_updates.id"), nullable=False)
    recycler_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    material_type = Column(String(50), default="nylon")
    weight_kg = Column(Float, default=10.0)
    status = Column(String(30), default="pending")  # pending | collected | processed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    recovery_update = relationship("RecoveryUpdate", back_populates="recycling_assignment")
    recycler = relationship("User", back_populates="recycling_assignments")
