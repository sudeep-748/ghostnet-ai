# GhostNet AI — Team Engineering Guide

**Project:** GhostNet AI (Automated Marine ALDFG Detection, Crowdsourced Reporting & Recovery Coordination)  
**Track / Initiative:** InnoHack 2.0 / Ocean Conservation AI  
**Repository:** `ghostnet-ai`  

---

## 1. Executive Summary

GhostNet AI addresses the catastrophic environmental impact of **Abandoned, Lost, or Discarded Fishing Gear (ALDFG)**—commonly referred to as **"ghost nets"**. Millions of metric tons of synthetic fishing gear roam ocean currents, indiscriminately trapping marine wildlife, destroying coral reefs, and endangering maritime navigation.

GhostNet AI unifies:
1. **Edge/Aerial/Sonar Computer Vision** for automated net detection.
2. **Central Cloud Infrastructure & Dispatch Dashboard** for recovery coordination.
3. **Mobile First-Responder Client (Offline-First)** for divers, coastal patrol, and fishermen out at sea without cellular connectivity.
4. **IoT Telemetry & Acoustic Buoy Tracking** for physical recovery beaconing.

---

## 2. Team Structure & Division of Responsibilities

| Role | Focus Area | Core Technologies | Primary Deliverables |
| :--- | :--- | :--- | :--- |
| **Member 1** | AI & Computer Vision | PyTorch, YOLOv8/GhostNet, OpenCV, ONNX | Sonar/aerial net detection models, weight quantization, inference pipeline |
| **Member 2** | Cloud Backend & API | FastAPI, PostgreSQL/PostGIS, Docker, Leaflet/MapLibre | Central GeoJSON API, user management, recovery vessel dispatch dashboard |
| **Member 3** *(Current Role)* | **Mobile Client (Offline-First)** | **React Native, Expo, SQLite (`expo-sqlite`), `expo-location`, TypeScript** | **`mobile/` app with offline SQLite reporting, GPS location hooks, sync engine, evidence photo capture** |
| **Member 4** | Hardware & Edge IoT | ESP32 / Raspberry Pi, LoRaWAN, Acoustic Transponders | GPS drifter buoys, edge sonar sensor integration, satellite telemetry packetizer |

---

## 3. Member 3 Mandate: Mobile Client (`mobile/`)

### 3.1 Core Problem Statement
Fishermen, coastguards, and scientific divers operate offshore, far beyond cellular or Wi-Fi coverage. An effective marine reporting solution **must never fail due to lack of network**. It must:
- Instantly capture high-precision GPS coordinates using native satellite receivers.
- Persist rich incident reports (coordinates, gear type, wildlife entanglement, photos, notes) directly to a local, ACID-compliant **SQLite database**.
- Guarantee zero data loss through an idempotent **Sync Engine** that monitors network reachability and automatically drains the sync queue when connectivity is restored.

### 3.2 Member 3 Key Deliverables
1. **React Native Expo Application (`mobile/`)**:
   - Cross-platform Android & iOS support with modern TypeScript architecture.
2. **Offline-First SQLite Layer**:
   - `expo-sqlite` database with automated migration schema.
   - Dedicated `reports` table and `sync_queue` table with retry counters and sync states (`draft`, `pending_sync`, `synced`, `failed`).
3. **GPS Geolocation Subsystem**:
   - Custom `useLocation` hook for immediate high-accuracy single fixes with accuracy badges.
   - Custom `useLocationWatcher` hook for continuous coordinate tracking aboard moving vessels.
   - Coordinate formatting (Decimal Degrees & Nautical Degrees-Minutes-Seconds).
4. **Incident Capture & Photo Evidence**:
   - Net classification (Gillnet, Trawl, Purse Seine, Longline, Fish Trap/Pot, Unknown).
   - Hazard severity rating (Low, Medium, High, Critical).
   - Marine life entanglement flag with species/condition details.
   - Photo attachment via `expo-image-picker` with local file persistence.
5. **Network-Aware Sync Engine**:
   - Real-time connectivity hook (`useNetworkStatus` via `expo-network`).
   - Store-and-forward batch upload protocol with exponential backoff and idempotency keys.
   - Interactive Sync Center screen displaying queue metrics, manual sync triggers, and diagnostics.
6. **Marine Map & Incident Log View**:
   - Visual map plotting local offline logs alongside fetched regional hotspots.
   - Filterable, searchable incident feed.

---

## 4. API Contract & Integration Specifications

### 4.1 Report Submission Payload (`POST /api/v1/reports`)

When the mobile app syncs an offline report with Member 2's backend, it sends:

```json
{
  "client_report_uuid": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "device_id": "exp-dev-94a821e",
  "timestamp": 1728045600,
  "location": {
    "latitude": 13.0827,
    "longitude": 80.2707,
    "accuracy_meters": 4.2,
    "altitude_meters": 1.5,
    "depth_meters": 12.0
  },
  "net_metadata": {
    "net_type": "gillnet",
    "threat_level": "critical",
    "estimated_dimensions": {
      "length_meters": 45.0,
      "width_meters": 10.0
    },
    "entangled_wildlife": true,
    "wildlife_notes": "Juvenile sea turtle trapped; alive but immobilized."
  },
  "notes": "Spotted near coral reef shelf. Buoy attached by diver.",
  "photos": [
    "data:image/jpeg;base64,..."
  ]
}
```

### 4.2 Sync Response (`201 Created` / `200 OK`)

```json
{
  "status": "success",
  "server_report_id": "GN-2026-IND-0042",
  "client_report_uuid": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "synced_at": "2026-10-04T12:45:00Z",
  "dispatch_status": "queued_for_patrol_verification"
}
```

---

## 5. Development & Branching Workflow

- `main`: Production-ready release branch.
- `feat/mobile-offline-sqlite`: Member 3 feature branch for mobile client.
- Commit message convention: `feat(mobile): <description>`, `fix(mobile): <description>`.
- Testing offline scenarios: Toggle Airplane Mode on physical device or emulator to verify offline SQLite persistence and subsequent auto-sync.
