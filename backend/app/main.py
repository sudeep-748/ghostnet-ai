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
from app.api.v1.admin import router as admin_router

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
app.include_router(admin_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    """Startup initialization: ensures database tables exist without wiping data.
    Data is ONLY cleared when user explicitly triggers POST /api/v1/auth/reset-database."""
    try:
        from app.core.database import Base, engine
        Base.metadata.create_all(bind=engine)
        print(">>> GhostNet AI backend started successfully! Persistent database active.")
        # Auto-seed authentic pilot data if fresh empty database
        db = SessionLocal()
        try:
            from app.api.v1.admin import seed_pilot_data
            seed_pilot_data(force=False, db=db)
        finally:
            db.close()
    except Exception as e:
        print(f">>> Database startup notice: {e}")

@app.post("/api/v1/auth/reset-database")
def reset_database():
    """Wipes all rows from all tables upon request."""
    db = SessionLocal()
    try:
        db.query(RecyclerAssignment).delete()
        db.query(RecoveryUpdate).delete()
        db.query(RecoveryMission).delete()
        db.query(DriftPrediction).delete()
        db.query(LostGearReport).delete()
        db.query(Gear).delete()
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
