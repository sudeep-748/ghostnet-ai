# GhostNet AI: System Architecture & Technical Specification Document

**Pilot Location:** Kasimedu Fishing Harbour & Chennai Coastline, Bay of Bengal  
**Platform Type:** Offline-First Marine Conservation & Drift Prediction Platform  
**Target Focus:** Abandoned, Lost, or Discarded Fishing Gear (ALDFG / "Ghost Gear")  

---

## 1. Executive Summary & Problem Context
**GhostNet AI** is an offline-first, geospatial marine conservation platform designed to track, predict the ocean drift trajectory of, and coordinate the recovery of Abandoned, Lost, or Discarded Fishing Gear (ALDFG or "ghost gear"). Ghost gear continues to snare marine organisms indefinitely ("ghost fishing"), ravaging fish stocks, endangering endangered Olive Ridley sea turtles, disrupting navigation channels, and introducing microplastics into marine food webs.

Existing marine litter solutions suffer from major architectural bottlenecks: reporting applications require live internet connections that fail past 3 nautical miles offshore, commercial drifting buoys are cost-prohibitive for artisanal fishers, and generalized ocean-drifting plastics models lack ties to actionable fisher reporting, recovery operations, or circular recycling loops.

GhostNet AI bridges this gap with an **edge-to-cloud distributed architecture** tailored for the Chennai coastline (Kasimedu Pilot). It enables artisanal fishers to report lost nets offline, leverages physical Lagrangian particle drift modeling powered by real-time marine meteorological data, packages offline mission packages with cached vector maps, guides recovery vessels without internet, and routes recovered polymers into circular recycling supply chains.

---

## 2. End-to-End Operational Lifecycle

| Phase | Location / Network | Primary Actor | System Behavior & Data Transitions |
| :--- | :--- | :--- | :--- |
| **1. Loss Report** | Offshore (Zero Connectivity) | Fisher | Fisher logs gear loss in Mobile App. High-accuracy GPS, loss timestamp, gear attributes (gillnet/nylon/weight), and compressed photo are persisted to local SQLite and queued in `local_sync_queue`. |
| **2. Ingestion** | Harbour / Cellular Range | Sync Daemon | App detects network connectivity via `NetInfo`. Triggers idempotent batch upload (`POST /api/reports/sync`) using `client_report_id`. Backend ingests report into PostGIS and dispatches simulation task to Celery. |
| **3. AI Simulation** | Cloud Worker Cluster | Celery Worker | Worker fetches ocean currents, 10m wind vectors, wave heights, and tides from Open-Meteo Marine API. Executes 5,000-particle Monte Carlo Lagrangian drift simulation across 24h, 48h, and 72h. Generates GeoJSON heatmap and risk polygons. |
| **4. Mission Prep** | Harbour / NGO HQ | Recovery Team | Team reviews active alerts and accepts mission. Backend bundles GeoJSON heatmap, search waypoints, weather snapshot, and vector tiles into an Offline Mission Package. Downloaded and cached to device. |
| **5. Navigation** | Offshore (Zero Connectivity) | Recovery Vessel | Vessel navigates offshore using MapLibre offline vector tiles and GPS heading. Live vessel coordinates are matched against the predictive drift heatmap and search corridor. |
| **6. Recovery Log** | Offshore (Zero Connectivity) | Recovery Team | Team spots and retrieves net. Logs status (`net_recovered`), recovered weight, GPS coordinates, and photos into local SQLite. |
| **7. Circular Flow** | Port / Recycler Yard | Admin / Recycler | Upon returning to port, recovery updates sync to PostgreSQL. Net is assigned to recycling partner. Platform computes avoided CO₂e emissions and protected marine fauna metrics. |

---

## 3. High-Level Distributed System Architecture

```text
+---------------------------------------------------------------------------------------------------+
|                                        FIELD EDGE TIER                                            |
|                                                                                                   |
|   +---------------------------------------+       +-------------------------------------------+   |
|   |          Fisher Mobile App            |       |           Recovery Team App               |   |
|   |  - One-tap Offline Report Form        |       |  - Mission Acceptance & Offline Packager  |   |
|   |  - Native GPS Polling (Expo Location) |       |  - Offline MapLibre Engine (MBTiles)      |   |
|   |  - Camera & Image Compression         |       |  - Live GPS Track vs Heatmap Overlay      |   |
|   +-------------------+-------------------+       +---------------------+---------------------+   |
|                       |                                                 |                         |
|                       +-----------------------+-------------------------+                         |
|                                               |                                                   |
|                               +---------------v---------------+                                   |
|                               |     Local SQLite Engine       |                                   |
|                               |  - local_sync_queue           |                                   |
|                               |  - local_reports / missions   |                                   |
|                               +---------------+---------------+                                   |
|                                               |                                                   |
|                               +---------------v---------------+                                   |
|                               |    Client Sync Orchestrator   |                                   |
|                               |  - NetInfo Network Listener   |                                   |
|                               |  - Exponential Backoff Queue  |                                   |
|                               +---------------+---------------+                                   |
+-----------------------------------------------|---------------------------------------------------+
                                                | HTTPS / TLS 1.3 (Opportunistic Sync)
                                                v
+---------------------------------------------------------------------------------------------------+
|                                       INGESTION & GATEWAY TIER                                    |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   |                           Nginx Reverse Proxy / SSL Termination                           |   |
|   +---------------------------------------------+---------------------------------------------+   |
|                                                 |                                                 |
|   +---------------------------------------------v---------------------------------------------+   |
|   |                              FastAPI Async REST Application                               |   |
|   |  - Pydantic v2 Schemas & Validation          - PostGIS Spatial Queries                    |   |
|   |  - JWT Authentication & RBAC                 - S3/MinIO Presigned Upload Service          |   |
|   |  - Idempotent Sync Endpoints                 - Mission Packaging Engine                   |   |
|   +-------------------+-----------------------------------------+-------------------------+---+   |
+-----------------------|-----------------------------------------|-------------------------|-------+
                        |                                         |                         |
                        v                                         v                         v
+-----------------------------------+ +-----------------------------------+ +-----------------------+
|      DATA PERSISTENCE TIER        | |      MESSAGE BROKER & CACHE       | |     OBJECT STORE      |
|                                   | |                                   | |                       |
|   PostgreSQL 16 + PostGIS         | |   Redis 7 (In-Memory)             | |   MinIO / AWS S3      |
|   - Spatial GIST Indexing         | |   - Celery Task Queues            | |   - Gear Photos       |
|   - LostGearReport & Predictions  | |   - Forecast Query Caching        | |   - Offline Zip Packs |
|   - Circular Recycler Records     | |   - Distributed Locks             | |   - Vector MBTiles    |
+-----------------------------------+ +-----------------+-----------------+ +-----------------------+
                                                        |
                                                        v
+---------------------------------------------------------------------------------------------------+
|                              DISTRIBUTED COMPUTE & SIMULATION TIER                                |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   |                                Celery Worker Cluster (Python)                             |   |
|   |                                                                                           |   |
|   |   +-----------------------+   +---------------------------+   +-----------------------+   |   |
|   |   |  Open-Meteo Client    |   | Lagrangian Drift Engine   |   |  Spatial Risk Scorer  |   |   |
|   |   |  - Ocean Currents u,v |-->| - 5000 Particles / Net    |-->|  - Eco-Sens. Polygons |   |   |
|   |   |  - 10m Wind & Waves   |   | - Stokes Wave Drift       |   |  - Density Binning    |   |   |
|   |   |  - Tidal Sea Levels   |   | - Gear Buoyancy Leeway    |   |  - GeoJSON Heatmaps   |   |   |
|   +---+-----------------------+---+---------------------------+---+-----------------------+---+   |
+---------------------------------------------------------------------------------------------------+
                                                        |
                                                        v
+---------------------------------------------------------------------------------------------------+
|                                  COMMAND & CONTROL WEB PORTAL                                     |
|                                                                                                   |
|   React + Vite + Tailwind CSS + MapLibre GL JS Web Dashboard                                      |
|   - Live Fleet & Lost Gear Tracking              - Interactive Multi-temporal Drift Overlays      |
|   - Mission Dispatcher & Team Assignment         - Circular Economy & Recycler Metric Visualizer  |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Edge Client Architecture (React Native & Expo)

### 4.1 State & Persistence Layer
- **expo-sqlite (Local Database)**: Replicates a hardened local mirror of the server tables. Operates with write-ahead logging (WAL mode) enabled for rapid offline inserts.
- **Client Sync Queue**: Every mutation (loss report submission, status update, photo capture) creates an immutable record in `local_sync_queue` with a unique `queue_id` and a client-side generated `client_report_id` (UUIDv4).
- **Zustand State Stores**: Lightweight state containers manage active report drafts, network availability states, and downloaded mission packages in memory.

### 4.2 Offline Mapping Engine
- **MapLibre React Native**: Uses self-contained vector tile packages (MBTiles) bounded to the Chennai region (Lat: 12.90°N to 13.25°N, Lon: 80.10°E to 80.45°E).
- **GeoJSON Layer Rendering**: Ingests `drift_heatmap_geojson` and `planned_route_geojson` directly into MapLibre Source and Layer components without requiring web tile servers at sea.

---

## 5. AI Drift Prediction & Spatial Risk Engine

### 5.1 Lagrangian Particle Tracking Formulation
The prediction engine models lost nets as an ensemble of $N = 5,000$ virtual particles initialized at the reported loss coordinate $(\lambda_0, \phi_0)$. Virtual particles account for observational uncertainty by sampling an initial Gaussian position perturbation ($\sigma = 50\text{ m}$).

The discrete-time trajectory for particle $i$ over hourly time steps $\Delta t = 3600\text{ s}$ up to $T = 72\text{ hours}$ is governed by:

$$\vec{x}(t + \Delta t) = \vec{x}(t) + \left[ \vec{u}_{\text{current}} + (\alpha \cdot \vec{u}_{\text{wind}}) + (\beta \cdot \vec{u}_{\text{wave}}) + \vec{\eta} \right] \cdot \Delta t$$

Where:
- **Ocean Current Velocity ($\vec{u}_{\text{current}}$)**: Vector $(u, v)$ in $\text{m/s}$ fetched from Open-Meteo Marine API at surface depth.
- **Windage Factor ($\alpha$)**: Drag coefficient calibrated by gear buoyancy:
  - Surface Buoys / Floats: $\alpha = 0.035 - 0.045$
  - Suspended Gillnets: $\alpha = 0.010 - 0.015$ (subsurface drag dominance)
  - Demersal Trawls / Metal Traps: $\alpha = 0.002 - 0.005$ (near-bottom anchor effect)
- **Stokes Wave Drift ($\beta \cdot \vec{u}_{\text{wave}}$)**: Surface wave momentum calculated from significant wave height ($H_s$), wave direction ($\theta_w$), and peak period ($T_p$) ($\beta \approx 0.015$).
- **Stochastic Diffusion ($\vec{\eta}$)**: Turbulent Brownian diffusion representing unresolved sub-grid eddies:
  $$\vec{\eta} \sim \mathcal{N}\left(0, \sqrt{\frac{2 K_h}{\Delta t}}\right), \quad K_h = 1.0\text{ m}^2/\text{s}$$

### 5.2 Probability Density Gridding
At intervals $t = 24\text{h}, 48\text{h}, 72\text{h}$, particle coordinates are binned into a regular geospatial matrix ($\Delta\lambda, \Delta\phi = 0.002^\circ \approx 220\text{ m}$). Cell density is computed as:
$$\text{Density}(i, j) = \frac{\text{ParticleCount}(i, j)}{N_{\text{total}}}$$

Cells are vectorized into closed polygons using GeoPandas and contour algorithms, generating GeoJSON FeatureCollections categorized by probability levels (`critical`, `high`, `medium`, `low`).

### 5.3 Composite Spatial Risk Scoring Formula
$$\text{Composite Risk Score} = (\text{Density} \times 0.45) + (\text{Ecological} \times 0.30) + (\text{FishingActivity} \times 0.15) + (\text{Navigation} \times 0.10)$$

| Zone Score | Classification | Recommended Action | Chennai Regional Benchmark |
| :--- | :--- | :--- | :--- |
| **76 – 100** | **CRITICAL** | Immediate Recovery Alert | Adyar Estuary mouth (13.00°N, 80.27°E) & Olive Ridley turtle breeding strip |
| **51 – 75** | **HIGH** | Recommend Patrol Mission | Kasimedu mechanized trawl lanes & Ennore navigation approaches |
| **26 – 50** | **MEDIUM** | Add to Watchlist | Kovalam-Muttukadu coastal waters & mid-shelf artisanal zones |
| **0 – 25** | **LOW** | Passive Monitoring | Deep offshore pelagic waters (>30 nautical miles) |

---

## 6. Offline Mission Package Specification
Bundled JSON and vector package:
```json
{
  "mission_id": "8f9a2b1c-7d4e-4f1a-b2c3-d4e5f6a7b8c9",
  "report_id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
  "prediction_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "offline_map_bbox": [80.10, 12.90, 80.45, 13.25],
  "drift_heatmap_geojson": { "type": "FeatureCollection", "features": [...] },
  "recommended_route_geojson": { "type": "Feature", "geometry": { "type": "LineString" } },
  "high_risk_zones_geojson": { "type": "FeatureCollection", "features": [...] },
  "reported_loss_point": { "latitude": 13.1122, "longitude": 80.2937 },
  "weather_snapshot": {
    "current_velocity_knots": 1.2,
    "current_direction_deg": 45.0,
    "wave_height_m": 1.4,
    "wind_speed_knots": 12.0
  },
  "generated_at": "2026-10-04T07:15:00Z"
}
```

---

## 7. Circular Economy Impact Calculation Model
- **CO₂e Avoided (kg)**: $\text{Recovered Net Weight (kg)} \times \text{Material Emission Factor}$
  - Nylon 6 (PA6): $6.5\text{ kg CO}_2\text{e/kg}$
  - HDPE: $2.1\text{ kg CO}_2\text{e/kg}$
  - PP Ropes: $1.9\text{ kg CO}_2\text{e/kg}$
- **Protected Marine Animals**: $\text{Recovered Net Weight (kg)} \times 0.12$ (100 kg recovered net protects ~12 marine organisms over 12 months).

---

## 8. Service Directory Structure
```text
backend/app/services/
├── marine_meteo.py      # Open-Meteo Marine API client (currents, winds, waves, tides)
├── drift_engine.py      # 5000-particle Lagrangian drift simulator & GeoJSON generator
├── risk_scoring.py      # Spatial polygon intersection & risk scoring
└── package_bundler.py   # Offline mission pack JSON/archive bundler
```
