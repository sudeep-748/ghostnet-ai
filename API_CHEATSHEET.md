# GhostNet AI — Backend API Cheatsheet 📡

This document is provided by **Member 2 (Backend Lead)** for **Member 3 (Mobile Lead)** and **Member 4 (Web Lead)** so everyone knows the exact URLs and JSON structures to connect to.

* **Base URL:** `http://localhost:8000/api/v1` (or `http://<YOUR_IP>:8000/api/v1` when on mobile via local Wi-Fi)
* **Interactive Docs:** `http://localhost:8000/docs`

---

## 📱 For Member 3 (Mobile App Endpoints)

### 1. Offline Batch Sync (When boat docks at harbour)
* **Method:** `POST`
* **URL:** `/api/v1/reports/sync`
* **Request Body:**
```json
{
  "reports": [
    {
      "client_report_id": "phone-uuid-v4-generated-on-device",
      "loss_latitude": 13.1122,
      "loss_longitude": 80.2937,
      "loss_time": "2026-10-04T06:30:00Z",
      "gear_type": "gillnet",
      "material": "nylon",
      "estimated_quantity": 1,
      "photo_url": "/api/v1/uploads/photo/abc.jpg",
      "sea_condition": "moderate",
      "notes": "Snagged on rocks near Kasimedu"
    }
  ]
}
```
* **Success Response (200 OK):**
```json
{
  "synced_count": 1,
  "synced_ids": ["uuid-saved-in-db"],
  "failed_count": 0
}
```

### 2. Upload Net Photo from Camera
* **Method:** `POST` (Multipart form-data)
* **URL:** `/api/v1/uploads/photo`
* **Form Field:** `file` (image file: JPEG, PNG)
* **Success Response (201 Created):**
```json
{
  "filename": "uuid.jpg",
  "photo_url": "/api/v1/uploads/photo/uuid.jpg"
}
```

### 3. Download Offline Mission Package (Before leaving harbour)
* **Method:** `POST`
* **URL:** `/api/v1/missions/{mission_id}/offline-package`
* **Response:** Bundled JSON containing Chennai bounding box, recommended routes, weather snapshot, and GeoJSON heatmap.

---

## 💻 For Member 4 (Web Dashboard Endpoints)

### 1. Get Environmental Impact Metrics
* **Method:** `GET`
* **URL:** `/api/v1/analytics/impact`
* **Response:**
```json
{
  "total_reports": 5,
  "active_missions": 2,
  "completed_missions": 3,
  "total_recovered_kg": 75.0,
  "total_nets_removed": 4,
  "estimated_animals_protected": 9,
  "co2e_avoided_kg": 487.5,
  "recycled_material_kg": 75.0,
  "offline_reports_synced": 5,
  "recovery_success_rate_percent": 80.0,
  "avg_recovery_time_hours": 14.5
}
```

### 2. Get All Lost Gear Reports (For Live Map Markers)
* **Method:** `GET`
* **URL:** `/api/v1/reports/lost-gear`

### 3. Get Drift Prediction Heatmap (For Map Overlays)
* **Method:** `GET`
* **URL:** `/api/v1/predictions/{prediction_id}/heatmap`
* **Response:** Standard GeoJSON FeatureCollection ready for MapLibre / Mapbox `addSource()`!

### 4. Assign Net to Recycler
* **Method:** `POST`
* **URL:** `/api/v1/recycling/assignments`
* **Request Body:**
```json
{
  "recovery_update_id": "uuid-here",
  "recycler_id": "recycler-uuid",
  "material_type": "nylon",
  "weight_kg": 25.0
}
```
