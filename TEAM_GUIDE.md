# GhostNet AI — Team Roles & Implementation Guide

## Team Distribution & Responsibilities

GhostNet AI is divided across 5 core technical tracks. Each team member is responsible for key decoupled services ensuring an offline-first, highly scalable marine conservation platform.

---

### Member 1: Oceanographic & Meteorological Services, Lagrangian Drift Engine
**Primary Modules:**
- `backend/app/services/marine_meteo.py`
  - Open-Meteo Marine & Weather API client.
  - Surface ocean current vector decomposition $(u, v)$.
  - 10-meter wind vector decomposition $(u, v)$.
  - Significant wave height ($H_s$), wave direction ($\theta_w$), and peak period ($T_p$) Stokes drift.
  - Robust offline / caching fallback for Bay of Bengal / Chennai coastal waters.
- `backend/app/services/drift_engine.py`
  - 5,000-particle Monte Carlo Lagrangian trajectory simulation over 72 hours.
  - Observational initial position perturbation ($\sigma = 50\text{ m}$).
  - Euler-Maruyama discrete time integration with Brownian turbulent diffusion ($K_h = 1.0\text{ m}^2/\text{s}$).
  - Buoyancy windage factors: surface buoys ($\alpha \approx 0.040$), gillnets ($\alpha \approx 0.0125$), demersal trawls ($\alpha \approx 0.0035$).
  - Probability density gridding ($\Delta\lambda, \Delta\phi = 0.002^\circ \approx 220\text{ m}$) at 24h, 48h, 72h checkpoints.
  - Vectorized GeoJSON polygon generation (`FeatureCollection`) with risk level categorizations.

---

### Member 2: Spatial Risk Scoring & Offline Mission Packaging
**Primary Modules:**
- `backend/app/services/risk_scoring.py`
  - Ecological sensitivity polygons (Olive Ridley turtle breeding areas, Adyar Estuary, Kovalam).
  - Kasimedu trawling corridors and Ennore shipping navigation channels.
  - Composite spatial risk formula: $(0.45 \times \text{Density}) + (0.30 \times \text{Ecological}) + (0.15 \times \text{Fishing}) + (0.10 \times \text{Navigation})$.
- `backend/app/services/package_bundler.py`
  - Offline mission package bundler (JSON bundle + vector MBTiles).

---

### Member 3: FastAPI Backend Core, Database & Async Tasks
**Primary Modules:**
- `backend/app/api/v1/`: Auth, gear, reports, predictions, missions, recycling, sync endpoints.
- PostgreSQL + PostGIS schema migrations and SQLAlchemy models.
- Celery worker task dispatching and Redis caching.

---

### Member 4: Edge Mobile Client (React Native & Expo)
**Primary Modules:**
- Offline-first SQLite queue (`local_sync_queue`, `local_reports`, `local_missions`).
- Background opportunistic sync engine (`NetInfo` with exponential backoff).
- MapLibre offline vector mapping and GPS track logging.

---

### Member 5: Command & Control Web Dashboard (React & Vite)
**Primary Modules:**
- Web dashboard with MapLibre GL JS live fleet and drift overlays.
- Mission coordination, team dispatcher, and circular economy / ESG analytics.
