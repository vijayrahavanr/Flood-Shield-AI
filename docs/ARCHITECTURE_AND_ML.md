# FLOODSHIELD AI — Architecture, AI/ML Explainability, Remote Sensing & Health Protection Guide

## 1. End-to-End System Architecture

```text
+-----------------------------------------------------------------------------------+
|                        EXTERNAL / TELEMETRY DATA SOURCES                          |
|  - IMD / OpenWeatherMap (Rainfall, Intensity, Temp, Humidity, Wind, Soil Moisture)|
|  - Central Water Commission (CWC) / USGS (River Stage, Warning/Danger, Discharge) |
|  - Copernicus Sentinel-1 SAR (VV/VH dB) & Sentinel-2 MSI (Band 3 Green, Band 8 NIR)|
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                     FASTAPI BACKEND & DOMAIN SERVICE LAYER                        |
|  +-----------------------+  +------------------------+  +----------------------+  |
|  | FloodPrediction       |  | RemoteSensingProcessor |  | PostFloodHealthRisk  |  |
|  | Pipeline (XGBoost,    |  | (TOA/Lee Preprocessing,|  | Engine (8 WASH &     |  |
|  | Random Forest, LR +   |  |  NDWI & SAR Threshold, |  | Vector Sub-Scores +  |  |
|  | SHAP Explainability)  |  |  GeoJSON Vectorizer)   |  | Public Health Plan)  |  |
|  +-----------------------+  +------------------------+  +----------------------+  |
|                                         |                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Configurable AlertEngine + RBAC JWT Security + SQLite/PostgreSQL Repository |  |
+-----------------------------------------+-----------------------------------------+
                                          | REST JSON & GeoJSON APIs
                                          v
+-----------------------------------------------------------------------------------+
|               REACT 18 + TYPESCRIPT + TAILWIND + LEAFLET FRONTEND                 |
|  - 16 Operational Pages (Dashboard, AI Simulator, GIS Command Map, Remote Sensing,|
|    Health Protection, Alert Center, Evacuation/Response, Analytics, SitRep, Admin)|
+-----------------------------------------------------------------------------------+
```

## 2. Replacing Simulated Satellite Data with Live GeoTIFF Rasters

The `RemoteSensingProcessor` (`backend/app/gis/remote_sensing_processor.py`) computes:
- **Normalized Difference Water Index (NDWI):**
  $$\text{NDWI} = \frac{\text{Band}_{\text{Green (B03)}} - \text{Band}_{\text{NIR (B08)}}}{\text{Band}_{\text{Green (B03)}} + \text{Band}_{\text{NIR (B08)}}}$$
- **Sentinel-1 SAR Specular Water Mask:** Flags pixels where filtered C-band VV backscatter drops below `-16.5 dB`.

To feed live GeoTIFF files from Copernicus Sentinel Hub or USGS EarthExplorer:
1. Read Band 3 (`B03.tif`) and Band 8 (`B08.tif`) into 2D NumPy arrays using `rasterio` or `gdal`.
2. Pass `green_band_matrix` and `nir_band_matrix` to `POST /api/remote-sensing/analyze`.
