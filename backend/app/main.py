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
    """Seeds initial demonstration data for the Kasimedu Harbour pilot if database is empty."""
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            # 1. Create Demo Admin User
            admin_user = User(
                id=str(uuid.uuid4()),
                name="Kasimedu Harbour Master",
                phone="9876543210",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            
            # 2. Create Demo Fisher
            fisher_user = User(
                id=str(uuid.uuid4()),
                name="Senthil Murugan (Fisher)",
                phone="9876543211",
                hashed_password=get_password_hash("fisher123"),
                role="fisher"
            )

            # 3. Create Demo Recovery Team
            recovery_user = User(
                id=str(uuid.uuid4()),
                name="Bay Patrol Team Alpha",
                phone="9876543212",
                hashed_password=get_password_hash("recovery123"),
                role="recovery_team"
            )

            # 4. Create Demo Recycler
            recycler_user = User(
                id=str(uuid.uuid4()),
                name="Chennai EcoPlast Circular Solutions",
                phone="9876543213",
                hashed_password=get_password_hash("recycler123"),
                role="recycler"
            )

            db.add_all([admin_user, fisher_user, recovery_user, recycler_user])
            db.flush()

            # 5. Create Demo Boat
            demo_boat = Boat(
                id=str(uuid.uuid4()),
                name="Meenavan-1",
                registration_number="IND-TN-02-MM-4402",
                harbour="Kasimedu",
                owner_id=fisher_user.id
            )
            db.add(demo_boat)
            db.flush()

            # 6. Create Demo Lost Gear Report (Kasimedu Offshore: 13.1122N, 80.2937E)
            demo_report = LostGearReport(
                id=str(uuid.uuid4()),
                client_report_id="demo-kasimedu-report-001",
                reported_by=fisher_user.id,
                boat_id=demo_boat.id,
                loss_latitude=13.1122,
                loss_longitude=80.2937,
                loss_time=datetime.now(timezone.utc),
                gear_type="gillnet",
                material="nylon",
                estimated_quantity=1,
                notes="Snagged on submerged rocks 4 nautical miles east of Kasimedu harbour",
                sync_status="synced"
            )
            db.add(demo_report)
            db.flush()

            # 7. Create Demo Prediction with Drift Heatmap
            demo_prediction = DriftPrediction(
                id=str(uuid.uuid4()),
                report_id=demo_report.id,
                forecast_hours=72,
                particles=5000,
                confidence_score=0.89,
                status="completed",
                heatmap_geojson={
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [[
                                    [80.2937, 13.1122],
                                    [80.3150, 13.1350],
                                    [80.3350, 13.1550],
                                    [80.3550, 13.1750],
                                    [80.3400, 13.1700],
                                    [80.3100, 13.1300],
                                    [80.2937, 13.1122]
                                ]]
                            },
                            "properties": {
                                "risk_level": "critical",
                                "risk_score": 86.4,
                                "forecast_hours": 48,
                                "zone_name": "Kasimedu Northeast Trawl Ground"
                            }
                        }
                    ]
                },
                predicted_path_geojson={
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [80.2937, 13.1122],
                            [80.3150, 13.1350],
                            [80.3350, 13.1550],
                            [80.3550, 13.1750]
                        ]
                    },
                    "properties": {"speed_knots": 1.2}
                }
            )
            db.add(demo_prediction)
            db.flush()

            # 8. Create Active Recovery Mission
            demo_mission = RecoveryMission(
                id=str(uuid.uuid4()),
                prediction_id=demo_prediction.id,
                report_id=demo_report.id,
                team_id=recovery_user.id,
                boat_id=demo_boat.id,
                status="active",
                started_at=datetime.now(timezone.utc)
            )
            db.add(demo_mission)
            db.flush()

            # 9. Create Historical Recovery Update for Impact calculation
            demo_update = RecoveryUpdate(
                id=str(uuid.uuid4()),
                client_update_id="demo-recovery-update-001",
                mission_id=demo_mission.id,
                report_id=demo_report.id,
                team_id=recovery_user.id,
                status="net_recovered",
                latitude=13.1350,
                longitude=80.3150,
                weight_kg=18.5,
                notes="Successfully recovered entangled nylon gillnet. No marine life trapped.",
                sync_status="synced"
            )
            db.add(demo_update)
            db.flush()

            # 10. Recycler Assignment
            demo_recycler_assignment = RecyclerAssignment(
                id=str(uuid.uuid4()),
                recovery_update_id=demo_update.id,
                recycler_id=recycler_user.id,
                material_type="nylon",
                weight_kg=18.5,
                status="collected"
            )
            db.add(demo_recycler_assignment)

            db.commit()
            print(">>> GhostNet AI demo seed data successfully populated!")
    except Exception as e:
        db.rollback()
        print(f">>> Seed data initialization error: {e}")
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
