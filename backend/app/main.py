from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import uuid

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models.models import User, Boat, Gear, LostGearReport, DriftPrediction, RecoveryMission, RecoveryUpdate, RecyclerAssignment
from app.core.security import get_password_hash

# Import API Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.gear import router as gear_router
from app.api.v1.reports import router as reports_router
from app.api.v1.predictions import router as predictions_router
from app.api.v1.missions import router as missions_router
from app.api.v1.recycling import router as recycling_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.uploads import router as uploads_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="GhostNet AI: Offline-First Marine Conservation & Drift Prediction Platform (Kasimedu, Chennai Pilot)"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(gear_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(predictions_router, prefix=settings.API_V1_STR)
app.include_router(missions_router, prefix=settings.API_V1_STR)
app.include_router(recycling_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(uploads_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def seed_demo_data():
    """Wipes all data on startup to guarantee a completely clean database for new users."""
    db = SessionLocal()
    try:
        db.query(RecyclerAssignment).delete()
        db.query(RecoveryUpdate).delete()
        db.query(RecoveryMission).delete()
        db.query(DriftPrediction).delete()
        db.query(RecoveryReport).delete()
        db.query(Boat).delete()
        db.query(User).delete()
        db.commit()
        print(">>> GhostNet AI database wiped completely clean on startup!")
    except Exception as e:
        db.rollback()
        print(f">>> Database wipe error: {e}")
    finally:
        db.close()

@app.post("/api/v1/auth/reset-database")
def reset_database():
    """Wipes all rows from all tables upon request."""
    db = SessionLocal()
    try:
        db.query(RecyclerAssignment).delete()
        db.query(RecoveryUpdate).delete()
        db.query(RecoveryMission).delete()
        db.query(DriftPrediction).delete()
        db.query(RecoveryReport).delete()
        db.query(Boat).delete()
        db.query(User).delete()
        db.commit()
        return {"status": "success", "message": "All database tables wiped completely clean."}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "pilot": "Kasimedu Fishing Harbour, Chennai",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}
