# FLOODSHIELD AI — REST API Documentation

Base URL: `http://localhost:8000/api`  
Interactive Swagger UI: `http://localhost:8000/api/docs`  
Interactive ReDoc: `http://localhost:8000/api/redoc`

## 1. Authentication & RBAC (`/api/auth`)
- `POST /api/auth/login` — Authenticate with `email` and `password`; returns `access_token` (JWT HS256) and `user` profile with `permissions`.
- `POST /api/auth/register` — Register a new user with `full_name`, `email`, `password`, `role_name`, `organization`, `phone`, `assigned_location_id`.
- `POST /api/auth/forgot-password` — Generate recovery verification code.
- `GET /api/auth/me` — Retrieve current user profile from Bearer token.

## 2. Dashboard Summary (`/api/dashboard`)
- `GET /api/dashboard/summary?location_id=1` — Returns 8 KPI cards, 14-day multi-parameter trend series, latest AI prediction + SHAP explanation, active alerts, and GIS overview layers.

## 3. AI/ML Flood Prediction & Explainability (`/api/flood`)
- `POST /api/flood/predict` — Run real-time inference (`xgboost`, `random_forest`, or `logistic_regression`). Returns `flood_probability`, `risk_score`, `risk_category`, `estimated_affected_area_sq_km`, `estimated_population_at_risk`, `model_comparison`, `explanation` (SHAP contributions + qualitative ratings), and `triggered_alerts`.
- `GET /api/flood/history?location_id=1` — Historical predictions and past flood events.
- `GET /api/flood/models` — Model validation metrics (`accuracy`, `precision`, `recall`, `f1_score`, `roc_auc`, `brier_score`, `confusion_matrix`) and global feature importances.
- `POST /api/flood/retrain` — Retrain all 3 ML models on `data/sample/flood_training_dataset.csv`.

## 4. Weather, Climate & River Telemetry (`/api/weather`, `/api/river`)
- `GET /api/weather/current?location_id=1` — Current rainfall, intensity, temperature, humidity, wind speed, soil moisture, and climate anomaly indicators.
- `GET /api/weather/history?location_id=1` — 14-day weather observation time-series.
- `GET /api/river/current?location_id=1` — Current river stage (m), warning/danger thresholds, discharge (cumecs), velocity (m/s), and trend.
- `GET /api/river/history?location_id=1` — 14-day river stage & discharge history.

## 5. Remote Sensing & Flood Extent Detection (`/api/remote-sensing`)
- `POST /api/remote-sensing/analyze` — Run the 6-stage Sentinel-2 NDWI + Sentinel-1 SAR processing pipeline; outputs surface water area, active flood anomaly area, NDWI histogram, and GeoJSON `FeatureCollection`.
- `GET /api/remote-sensing/observations?location_id=1` — Retrieve stored satellite observations and GeoJSON flood masks.

## 6. GIS Flood Zones & Multi-Layer Map (`/api/flood-zones`)
- `GET /api/flood-zones?location_id=1` — Returns GeoJSON `FeatureCollection` of flood risk zones, remote-sensing water extent, shelters, hospitals, evacuation assembly points, and safe evacuation corridors.

## 7. Post-Flood Health Protection (`/api/health-risk`)
- `GET /api/health-risk?location_id=1` — Returns latest post-flood environmental health assessment, medical non-diagnosis disclaimer, 8 risk sub-scores, contributing factors, recommended WASH/vector actions, and priority areas.
- `POST /api/health-risk/assess` — Run custom post-flood environmental health risk simulation and store assessment.

## 8. Alert Engine (`/api/alerts`)
- `GET /api/alerts?location_id=1&severity=CRITICAL` — List active and historical alerts plus threshold configurations.
- `POST /api/alerts` — Broadcast a new emergency alert.
- `POST /api/alerts/{alert_id}/acknowledge` — Acknowledge an active alert.
- `PUT /api/alerts/thresholds/{threshold_id}` — Update warning, high, and critical thresholds.

## 9. Evacuation & Emergency Response (`/api/response`)
- `GET /api/response/overview?location_id=1` — Shelters, hospitals, emergency resources, emergency contacts, and utilization metrics.
- `PUT /api/response/shelters/{shelter_id}` — Update shelter occupancy, water supply, and sanitation status.
- `PUT /api/response/resources/{resource_id}` — Update deployed emergency resource quantities.

## 10. Analytics, Reports, Data & Admin (`/api/analytics`, `/api/reports`, `/api/data`, `/api/admin`)
- `GET /api/analytics/overview` — Cross-basin comparative risk analytics, ML benchmarks, and seasonal profiles.
- `GET /api/reports/generate?location_id=1` — Generate official Markdown & JSON Situation Report (`SitRep`).
- `GET /api/data/datasets` — Dataset metadata and live database entity counts.
- `GET /api/admin/users` & `PUT /api/admin/users/{user_id}` — Manage users and RBAC roles.
- `GET /api/admin/logs` — System audit trail.
