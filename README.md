# FLOODSHIELD AI – Flood Prediction and Post-Flood Health Protection

> **Prototype notice:** This is an academic decision-support demo. Seeded observations and satellite scenes are simulated; external weather, river, and satellite services use mock adapters unless separately integrated and configured. Risk scores and health guidance are not operational warnings or medical diagnoses. Do not use this build to direct real-world evacuations or deploy it publicly without a security, data, and model validation review.

**Team Name:** Digital Pioneer  
**Domain:** Disaster Management, Climate Analytics, Remote Sensing, AI/ML, GIS  
**Architecture:** React 18 + TypeScript + Vite + Tailwind CSS + Leaflet/React-Leaflet + Recharts | Python FastAPI + SQLAlchemy + PostgreSQL/SQLite + Ensemble AI/ML (XGBoost, Random Forest, Logistic Regression) + SHAP Explainability + Sentinel-1/2 NDWI/SAR Processor

---

## 1. Executive Overview

**FLOODSHIELD AI** is an end-to-end, runnable full-stack disaster intelligence and post-flood environmental health decision-support platform. It integrates:
1. **Multi-Model AI/ML Flood Prediction (`backend/app/ml/flood_model.py`)**: Trains and compares **XGBoost Gradient Boosted Trees**, **Random Forest**, and **Logistic Regression** across 10 hydro-meteorological and topographic features (`rainfall`, `rainfall_intensity`, `temperature`, `humidity`, `river_level`, `soil_moisture`, `elevation`, `slope`, `drainage_index`, `historical_flood_count`).
2. **SHAP-Style Explainable AI**: Computes per-feature marginal attributions and qualitative factor ratings (`Very High`, `High`, `Moderate`, `Low`) so disaster officers understand *why* a flood risk score was triggered.
3. **Remote Sensing & Flood Extent Detection (`backend/app/gis/remote_sensing_processor.py`)**: Executes a 6-stage remote-sensing workflow supporting **Sentinel-2 MSI Optical NDWI** `[(B03 - B08) / (B03 + B08)]` and **Sentinel-1 C-Band SAR VV Backscatter (dB)** thresholding to extract active flood anomalies and vectorize them into GeoJSON polygons.
4. **Interactive GIS Command Map (`frontend/src/components/map/InteractiveFloodMap.tsx`)**: Multi-layer OpenStreetMap + Leaflet visualization of Flood Risk Zones (`CRITICAL`, `SEVERE`, `HIGH`, `MODERATE`, `LOW`), Remote-Sensing Water Extents, Post-Flood Health Risk Hotspots, Evacuation Shelters, Hospitals, and Evacuation Corridors.
5. **Post-Flood Health Protection Engine (`backend/app/services/health_risk_engine.py`)**: Evaluates 8 environmental health risk sub-categories (`water_contamination`, `diarrheal_disease_risk`, `mosquito_vector_risk`, `stagnant_water_risk`, `sanitation_risk`, `drinking_water_risk`, `heat_dehydration_risk`, `shelter_hygiene_risk`), identifies priority wards, and recommends public-health WASH & vector-control actions. *(Includes explicit non-diagnostic decision-support notice).*
6. **Configurable Alert Engine & Emergency Response**: Generates `INFO`, `WARNING`, `HIGH`, and `CRITICAL` alerts across 6 alert types and tracks shelter occupancy, hospital trauma/ICU beds, ambulances, and NDRF resources.
7. **JWT Authentication & 5-Role RBAC**: Supports `Admin`, `Disaster Management Officer`, `Health Officer`, `Analyst`, and `Viewer`.

---

## 2. Repository Structure

```text
floodshield-ai/
├── .env.example                       # Environment variables template with zero-cost fallback mode
├── docker-compose.yml                 # Full PostgreSQL + FastAPI + React/Nginx deployment
├── run_local.sh                       # 1-command launcher for Linux/macOS
├── run_local.bat                      # 1-command launcher for Windows
├── README.md                          # Complete setup, architecture, and usage guide
├── models/
│   └── model_registry.json            # Serialized trained weights, trees, and test metrics
├── data/
│   ├── sample/
│   │   ├── flood_training_dataset.csv # 1,500-row labeled hydro-meteorological dataset
│   │   └── sentinel_ndwi_scenes.json  # Preprocessed Sentinel-1/2 NDWI & SAR scenes
│   └── geojson/
│       └── flood_risk_zones.geojson   # Multi-severity basin GeoJSON polygons
├── docs/
│   ├── API_DOCS.md                    # Complete REST API endpoint reference
│   └── ARCHITECTURE_AND_ML.md         # System architecture, Remote Sensing & Health Engine guide
├── deploy/
│   └── nginx.conf                     # Production reverse-proxy configuration
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── floodshield.db                 # Pre-seeded SQLite database (ready out-of-the-box)
│   ├── export_demo_data.py
│   ├── migrations/
│   │   └── 001_initial_schema.sql     # Complete 16-table relational schema
│   ├── tests/
│   │   └── test_api.py                # End-to-end automated API & ML test suite
│   └── app/
│       ├── main.py                    # FastAPI application & REST API routes
│       ├── core/                      # Config, JWT auth, password hashing, RBAC
│       ├── db/                        # Unified SQLite/PostgreSQL repository & seed engine
│       ├── models/                    # SQLAlchemy declarative ORM models (16 entities)
│       ├── schemas/                   # Pydantic request/response schemas
│       ├── ml/                        # Flood ML training, inference & SHAP explainability
│       ├── gis/                       # Sentinel-1/2 NDWI & SAR flood extent processor
│       └── services/                  # Weather, Climate, WaterLevel, Health Risk & Alert engines
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx                    # React Router with all 16 public & main pages
        ├── api/client.ts              # Axios JWT client + severity color utilities
        ├── context/AuthContext.tsx    # Auth, RBAC permissions & 1-click role switcher
        ├── components/
        │   ├── layout/AppLayout.tsx   # Sidebar, Top Bar, Basin Selector & Role Switcher
        │   └── map/InteractiveFloodMap.tsx # Multi-layer Leaflet GeoJSON GIS Map
        └── pages/
            ├── auth/                  # Login, Register, ForgotPassword, Unauthorized (4 pages)
            └── main/                  # Dashboard, FloodPrediction, FloodMap, RemoteSensing,
                                       # HealthRisk, Alerts, EmergencyResponse, Analytics,
                                       # Reports, DataManagement, Settings, UserManagement (12 pages)
```

---

## 3. Quick Start (Run Locally in 2 Minutes)

### Option A: Automatic Launcher Script
- **Linux / macOS:**
  ```bash
  chmod +x run_local.sh
  ./run_local.sh
  ```
- **Windows:**
  ```bat
  run_local.bat
  ```

### Option B: Manual Step-by-Step Setup

1. **Backend Setup (`http://localhost:8000`)**
   ```bash
   cd backend
   python3 -m venv .venv
   # Activate venv: source .venv/bin/activate (Linux/macOS) or .venv\Scripts\activate (Windows)
   pip install -r requirements.txt
   python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   - Interactive Swagger API Docs: `http://localhost:8000/api/docs`
   - Run Automated Backend Tests:
     ```bash
     cd backend
     python3 tests/test_api.py
     ```

2. **Frontend Setup (`http://localhost:5173`)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 4. Pre-Seeded Demo Accounts (RBAC)

All demo accounts use password: **`Password123!`** (Also accessible via 1-Click Role Login buttons on the Login screen and Top Header):

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@floodshield.ai` | `Password123!` | Full system control, User/Role management, Threshold tuning, Model retraining |
| **Disaster Management Officer** | `dmo@floodshield.ai` | `Password123!` | Flood predictions, GIS command map, Alert broadcasting, Shelter & Resource dispatch |
| **Health Officer** | `health@floodshield.ai` | `Password123!` | Post-Flood Health Risk engine, WASH actions, Hospital capacity & Health alerts |
| **Analyst** | `analyst@floodshield.ai` | `Password123!` | AI/ML model training & comparison, SHAP explainability, Sentinel-1/2 NDWI/SAR analysis |
| **Viewer** | `viewer@floodshield.ai` | `Password123!` | Read-only access to Command Dashboard, GIS Flood Map, and Public Alerts |

---

## 5. Connecting Real External APIs (Optional)

The system runs out-of-the-box with realistic hydro-meteorological and satellite demo adapters (`USE_MOCK_EXTERNAL_APIS=true`). To connect live APIs, copy `.env.example` to `.env` and populate:
- `OPENWEATHER_API_KEY`: Live rainfall, temperature, wind, and humidity from OpenWeatherMap.
- `CWC_WATER_LEVEL_API_KEY`: Central Water Commission / USGS river gauge telemetry.
- `COPERNICUS_CLIENT_ID` & `COPERNICUS_CLIENT_SECRET`: Live Sentinel-1 SAR & Sentinel-2 MSI scenes from the Copernicus Data Space Ecosystem.
- `DATABASE_URL`: Switch from default `sqlite:///./floodshield.db` to `postgresql://user:pass@localhost:5432/floodshield_db`.
