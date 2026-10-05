import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "GhostNet AI"
    assert data["status"] == "online"

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_impact_analytics():
    response = client.get("/api/v1/analytics/impact")
    assert response.status_code == 200
    data = response.json()
    assert "total_reports" in data
    assert "co2e_avoided_kg" in data
    assert "estimated_animals_protected" in data

def test_create_lost_gear_report():
    report_data = {
        "client_report_id": "test-uuid-kasimedu-099",
        "loss_latitude": 13.1250,
        "loss_longitude": 80.3150,
        "gear_type": "gillnet",
        "material": "nylon",
        "estimated_quantity": 1,
        "sea_condition": "calm",
        "notes": "Testing net loss coordinate"
    }
    response = client.post("/api/v1/reports/lost-gear", json=report_data)
    assert response.status_code == 201
    data = response.json()
    assert data["loss_latitude"] == 13.1250
    assert data["sync_status"] == "synced"

def test_idempotent_offline_sync():
    batch_data = {
        "reports": [
            {
                "client_report_id": "batch-sync-test-uuid-001",
                "loss_latitude": 13.1400,
                "loss_longitude": 80.3200,
                "gear_type": "trawl_net",
                "material": "polyethylene",
                "estimated_quantity": 2,
                "notes": "Test batch offline sync"
            }
        ]
    }
    # First sync
    res1 = client.post("/api/v1/reports/sync", json=batch_data)
    assert res1.status_code == 200
    assert res1.json()["synced_count"] == 1

    # Second sync (Duplicate test - should not create duplicates)
    res2 = client.post("/api/v1/reports/sync", json=batch_data)
    assert res2.status_code == 200
    assert res2.json()["synced_count"] == 1

def test_generate_prediction():
    # First get an existing report
    reports_res = client.get("/api/v1/reports/lost-gear")
    assert reports_res.status_code == 200
    reports = reports_res.json()
    assert len(reports) > 0

    report_id = reports[0]["id"]
    pred_res = client.post("/api/v1/predictions/generate", json={
        "report_id": report_id,
        "forecast_hours": 48,
        "particles": 5000
    })
    assert pred_res.status_code == 201
    pred_data = pred_res.json()
    assert pred_data["forecast_hours"] == 48
    assert "heatmap_geojson" in pred_data
