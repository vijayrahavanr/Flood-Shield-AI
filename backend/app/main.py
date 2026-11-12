"""
FLOODSHIELD AI — FastAPI Backend Application
Team Name: Digital Pioneer
Project Title: FLOODSHIELD AI – Flood Prediction and Post-Flood Health Protection
Domain: Disaster Management, Climate Analytics, Remote Sensing, AI/ML, GIS
"""
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.security import (
    VALID_ROLES,
    bearer_scheme,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.db.database import (
    db_cursor,
    init_and_seed_database,
    log_system_event,
    row_to_dict,
    rows_to_dicts,
)
from app.gis.remote_sensing_processor import remote_sensing_processor
from app.ml.flood_model import flood_ml_pipeline
from app.schemas.api_schemas import (
    AlertCreateRequest,
    FloodPredictRequest,
    ForgotPasswordRequest,
    HealthRiskAssessRequest,
    LocationCreateRequest,
    LoginRequest,
    RegisterRequest,
    RemoteSensingAnalyzeRequest,
    ResourceUpdateRequest,
    ShelterUpdateRequest,
    ThresholdUpdateRequest,
    UserUpdateRequest,
)
from app.services.environmental_services import (
    alert_engine,
    climate_service,
    water_level_service,
    weather_service,
)
from app.services.health_risk_engine import MEDICAL_DISCLAIMER, health_risk_engine

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "End-to-End AI/ML Flood Prediction, Sentinel-1/2 Remote Sensing NDWI/SAR Inundation Mapping, "
        "GIS Risk Visualization, Alert Engine, Emergency Response, and Post-Flood Environmental Health "
        "Protection Decision-Support API. Built by Team Digital Pioneer."
    ),
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_and_seed_database()


# ============================================================================
# AUTHENTICATION & RBAC DEPENDENCIES
# ============================================================================

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Dict[str, Any]:
    """Returns authenticated user from Bearer JWT, or defaults to demo Admin in interactive mode."""
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        email = payload.get("sub")
        with db_cursor() as cur:
            cur.execute("SELECT * FROM users WHERE email = ?", (email,))
            user = row_to_dict(cur.fetchone())
            if user:
                user.pop("password_hash", None)
                return user
    # Fallback default user for unauthenticated interactive demo inspection
    with db_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = 1")
        user = row_to_dict(cur.fetchone())
        if user:
            user.pop("password_hash", None)
            return user
    return {"id": 1, "email": "admin@floodshield.ai", "full_name": "Dr. Aravind Krishnan", "role_name": "Admin"}


def require_roles(allowed_roles: List[str]):
    def role_checker(user: Dict[str, Any] = Depends(get_current_user_optional)) -> Dict[str, Any]:
        if user.get("role_name") not in allowed_roles and "Admin" not in user.get("role_name", ""):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.get('role_name')}' is not authorized. Required: {allowed_roles}",
            )
        return user
    return role_checker


def _get_location_or_404(location_id: int) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM locations WHERE id = ?", (location_id,))
        loc = row_to_dict(cur.fetchone())
        if not loc:
            cur.execute("SELECT * FROM locations ORDER BY id ASC LIMIT 1")
            loc = row_to_dict(cur.fetchone())
        if not loc:
            raise HTTPException(status_code=404, detail=f"Location {location_id} not found")
        return loc


# ============================================================================
# HEALTH CHECK & SYSTEM METADATA
# ============================================================================

@app.get("/api/health", tags=["System"])
def api_health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "team": settings.TEAM_NAME,
        "version": settings.VERSION,
        "database_mode": "SQLite (PostgreSQL-ready ORM)",
        "external_api_mode": "Mock/Demo Fallback Active" if settings.USE_MOCK_EXTERNAL_APIS else "Live External APIs",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


# ============================================================================
# 1. AUTHENTICATION ENDPOINTS (/api/auth/*)
# ============================================================================

@app.post("/api/auth/login", tags=["Authentication"])
def login(req: LoginRequest) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE lower(email) = lower(?)", (req.email.strip(),))
        user = row_to_dict(cur.fetchone())
        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        if not user.get("is_active", 1):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")

        cur.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
        cur.execute("SELECT permissions FROM roles WHERE id = ?", (user["role_id"],))
        role_row = row_to_dict(cur.fetchone())
        permissions = json.loads(role_row["permissions"]) if role_row else []

    token = create_access_token({"sub": user["email"], "role": user["role_name"], "user_id": user["id"]})
    user.pop("password_hash", None)
    user["permissions"] = permissions
    log_system_event("INFO", "AUTH", f"User login successful ({user['role_name']})", user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register(req: RegisterRequest) -> Dict[str, Any]:
    role_name = req.role_name if req.role_name in VALID_ROLES else "Viewer"
    with db_cursor() as cur:
        cur.execute("SELECT id FROM users WHERE lower(email) = lower(?)", (req.email.strip(),))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email is already registered")

        cur.execute("SELECT id, permissions FROM roles WHERE name = ?", (role_name,))
        role_row = row_to_dict(cur.fetchone())
        role_id = role_row["id"] if role_row else 5
        permissions = json.loads(role_row["permissions"]) if role_row else []

        pw_hash = get_password_hash(req.password)
        cur.execute(
            """INSERT INTO users (
                full_name, email, password_hash, role_id, role_name,
                organization, phone, assigned_location_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                req.full_name.strip(),
                req.email.strip().lower(),
                pw_hash,
                role_id,
                role_name,
                req.organization,
                req.phone,
                req.assigned_location_id or 1,
            ),
        )
        new_id = cur.lastrowid
        cur.execute("SELECT * FROM users WHERE id = ?", (new_id,))
        user = row_to_dict(cur.fetchone())

    token = create_access_token({"sub": user["email"], "role": user["role_name"], "user_id": user["id"]})
    user.pop("password_hash", None)
    user["permissions"] = permissions
    log_system_event("INFO", "AUTH", f"Registered new user ({role_name})", user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@app.post("/api/auth/forgot-password", tags=["Authentication"])
def forgot_password(req: ForgotPasswordRequest) -> Dict[str, Any]:
    log_system_event("INFO", "AUTH", "Password recovery link requested", req.email)
    return {
        "status": "sent",
        "email": req.email,
        "demo_reset_code": "FS-2026-RESET-8841",
        "message": f"If an account exists for {req.email}, password reset instructions and a temporary verification code have been dispatched.",
    }


@app.get("/api/auth/me", tags=["Authentication"])
def get_me(user: Dict[str, Any] = Depends(get_current_user_optional)) -> Dict[str, Any]:
    return {"user": user, "available_roles": VALID_ROLES}


# ============================================================================
# 2. LOCATIONS & BASINS (/api/locations)
# ============================================================================

@app.get("/api/locations", tags=["Locations & GIS"])
def list_locations() -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM locations ORDER BY id ASC")
        locs = rows_to_dicts(cur.fetchall())
    return {"count": len(locs), "locations": locs}


@app.post("/api/locations", status_code=status.HTTP_201_CREATED, tags=["Locations & GIS"])
def create_location(
    req: LocationCreateRequest,
    user: Dict[str, Any] = Depends(require_roles(["Admin", "Disaster Management Officer"])),
) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO locations (
                name, district, state, river_basin, latitude, longitude,
                elevation_m, slope_deg, drainage_index, population, area_sq_km,
                historical_flood_count, danger_river_level_m, warning_river_level_m
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                req.name, req.district, req.state, req.river_basin,
                req.latitude, req.longitude, req.elevation_m, req.slope_deg,
                req.drainage_index, req.population, req.area_sq_km,
                req.historical_flood_count, req.danger_river_level_m, req.warning_river_level_m,
            ),
        )
        new_id = cur.lastrowid
        cur.execute("SELECT * FROM locations WHERE id = ?", (new_id,))
        loc = row_to_dict(cur.fetchone())
    log_system_event("INFO", "LOCATIONS", f"Added monitored basin: {req.name}", user["email"])
    return {"location": loc}


# ============================================================================
# 3. DASHBOARD SUMMARY (/api/dashboard/summary)
# ============================================================================

@app.get("/api/dashboard/summary", tags=["Dashboard"])
def get_dashboard_summary(location_id: int = Query(default=1)) -> Dict[str, Any]:
    loc = _get_location_or_404(location_id)
    loc_id = loc["id"]

    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM weather_observations WHERE location_id = ? ORDER BY recorded_at DESC LIMIT 14",
            (loc_id,),
        )
        weather_hist = list(reversed(rows_to_dicts(cur.fetchall())))

        cur.execute(
            "SELECT * FROM river_observations WHERE location_id = ? ORDER BY recorded_at DESC LIMIT 14",
            (loc_id,),
        )
        river_hist = list(reversed(rows_to_dicts(cur.fetchall())))

        cur.execute(
            "SELECT * FROM flood_predictions WHERE location_id = ? ORDER BY predicted_at DESC LIMIT 1",
            (loc_id,),
        )
        latest_pred = row_to_dict(cur.fetchone())

        cur.execute(
            "SELECT * FROM health_risk_assessments WHERE location_id = ? ORDER BY assessed_at DESC LIMIT 1",
            (loc_id,),
        )
        latest_health = row_to_dict(cur.fetchone())

        cur.execute(
            "SELECT * FROM alerts WHERE location_id = ? AND is_active = 1 ORDER BY id DESC",
            (loc_id,),
        )
        active_alerts = rows_to_dicts(cur.fetchall())

        cur.execute("SELECT * FROM flood_zones WHERE location_id = ?", (loc_id,))
        zones = rows_to_dicts(cur.fetchall())

        cur.execute("SELECT * FROM shelters WHERE location_id = ?", (loc_id,))
        shelters = rows_to_dicts(cur.fetchall())

        cur.execute("SELECT * FROM hospitals WHERE location_id = ?", (loc_id,))
        hospitals = rows_to_dicts(cur.fetchall())

    latest_w = weather_hist[-1] if weather_hist else weather_service.get_current_weather(loc)
    latest_r = river_hist[-1] if river_hist else water_level_service.get_current_river_status(loc)

    if latest_pred:
        explanation = json.loads(latest_pred["explanation_json"])
        input_features = json.loads(latest_pred["input_features_json"])
        flood_prob_pct = round(float(latest_pred["flood_probability"]) * 100.0, 1)
        flood_risk_cat = latest_pred["risk_category"]
        flood_risk_score = latest_pred["risk_score"]
        affected_area = latest_pred["estimated_affected_area_sq_km"]
        pop_at_risk = latest_pred["estimated_population_at_risk"]
    else:
        pred_res = flood_ml_pipeline.predict(
            features={
                "rainfall": latest_w["rainfall_mm"],
                "rainfall_intensity": latest_w["rainfall_intensity_mm_hr"],
                "temperature": latest_w["temperature_c"],
                "humidity": latest_w["humidity_pct"],
                "river_level": latest_r["water_level_m"],
                "soil_moisture": latest_w["soil_moisture_pct"],
                "elevation": loc["elevation_m"],
                "slope": loc["slope_deg"],
                "drainage_index": loc["drainage_index"],
                "historical_flood_count": loc["historical_flood_count"],
            },
            area_sq_km=loc["area_sq_km"],
            population=loc["population"],
        )
        explanation = pred_res["explanation"]
        input_features = {}
        flood_prob_pct = pred_res["flood_probability_pct"]
        flood_risk_cat = pred_res["risk_category"]
        flood_risk_score = pred_res["risk_score"]
        affected_area = pred_res["estimated_affected_area_sq_km"]
        pop_at_risk = pred_res["estimated_population_at_risk"]

    health_score = latest_health["health_risk_score"] if latest_health else 74.5
    health_cat = latest_health["risk_category"] if latest_health else "HIGH"

    # Build 14-day combined trend series for Dashboard Recharts
    trends = []
    for idx, w in enumerate(weather_hist):
        r_lvl = river_hist[idx]["water_level_m"] if idx < len(river_hist) else latest_r["water_level_m"]
        r_warn = river_hist[idx]["warning_level_m"] if idx < len(river_hist) else loc["warning_river_level_m"]
        r_danger = river_hist[idx]["danger_level_m"] if idx < len(river_hist) else loc["danger_river_level_m"]
        day_prob = min(max(round((w["rainfall_mm"] / 260.0) * 65.0 + (r_lvl / r_danger) * 32.0, 1), 8.0), 96.0)
        day_health = min(max(round(day_prob * 0.78 + 12.0, 1), 15.0), 95.0)
        day_area = round(loc["area_sq_km"] * (day_prob / 100.0) * 0.42, 2)
        trends.append({
            "date": w["recorded_at"][:10],
            "rainfall_mm": w["rainfall_mm"],
            "rainfall_intensity_mm_hr": w["rainfall_intensity_mm_hr"],
            "water_level_m": r_lvl,
            "warning_level_m": r_warn,
            "danger_level_m": r_danger,
            "flood_probability_pct": day_prob,
            "health_risk_score": day_health,
            "affected_area_sq_km": day_area,
        })

    for z in zones:
        z["geojson"] = json.loads(z["geojson_polygon"])

    return {
        "location": loc,
        "kpis": {
            "current_flood_risk": flood_risk_cat,
            "flood_risk_score": flood_risk_score,
            "flood_probability_pct": flood_prob_pct,
            "rainfall_mm": latest_w["rainfall_mm"],
            "rainfall_intensity_mm_hr": latest_w["rainfall_intensity_mm_hr"],
            "river_level_m": latest_r["water_level_m"],
            "warning_level_m": latest_r["warning_level_m"],
            "danger_level_m": latest_r["danger_level_m"],
            "river_trend": latest_r["trend"],
            "affected_area_sq_km": affected_area,
            "population_at_risk": pop_at_risk,
            "health_risk_category": health_cat,
            "health_risk_score": health_score,
            "active_alerts_count": len(active_alerts),
        },
        "trends": trends,
        "ai_prediction": {
            "model_name": latest_pred["model_name"] if latest_pred else "xgboost",
            "flood_probability_pct": flood_prob_pct,
            "risk_category": flood_risk_cat,
            "risk_score": flood_risk_score,
            "input_features": input_features,
            "explanation": explanation,
        },
        "active_alerts": active_alerts[:8],
        "gis_overview": {
            "flood_zones": zones,
            "shelters": shelters,
            "hospitals": hospitals,
        },
    }


# ============================================================================
# 4. AI/ML FLOOD PREDICTION & EXPLAINABILITY (/api/flood/*)
# ============================================================================

@app.post("/api/flood/predict", tags=["AI/ML Flood Prediction"])
def predict_flood_risk(
    req: FloodPredictRequest,
    user: Dict[str, Any] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    loc = _get_location_or_404(req.location_id)
    features = {
        "rainfall": req.rainfall,
        "rainfall_intensity": req.rainfall_intensity,
        "temperature": req.temperature,
        "humidity": req.humidity,
        "river_level": req.river_level,
        "soil_moisture": req.soil_moisture,
        "elevation": req.elevation,
        "slope": req.slope,
        "drainage_index": req.drainage_index,
        "historical_flood_count": req.historical_flood_count,
    }
    prediction = flood_ml_pipeline.predict(
        features=features,
        model_choice=req.model_choice,
        area_sq_km=loc["area_sq_km"],
        population=loc["population"],
    )

    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO flood_predictions (
                location_id, model_name, flood_probability, risk_score,
                risk_category, estimated_affected_area_sq_km, estimated_population_at_risk,
                input_features_json, explanation_json, created_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                loc["id"],
                prediction["model_used"],
                prediction["flood_probability"],
                prediction["risk_score"],
                prediction["risk_category"],
                prediction["estimated_affected_area_sq_km"],
                prediction["estimated_population_at_risk"],
                json.dumps(features),
                json.dumps(prediction["explanation"]),
                user.get("id", 1),
            ),
        )
        pred_id = cur.lastrowid

        # Evaluate dynamic alerts if risk is elevated
        cur.execute("SELECT * FROM alert_thresholds")
        thresholds = rows_to_dicts(cur.fetchall())
        triggered_alerts = alert_engine.evaluate_and_generate_alerts(
            location_id=loc["id"],
            location_name=loc["name"],
            rainfall_mm=req.rainfall,
            river_level_m=req.river_level,
            warning_river_level_m=loc["warning_river_level_m"],
            danger_river_level_m=loc["danger_river_level_m"],
            flood_probability=prediction["flood_probability"],
            health_risk_score=round(prediction["risk_score"] * 0.85, 1),
            thresholds=thresholds,
        )

    log_system_event(
        "INFO",
        "ML_INFERENCE",
        f"Executed {prediction['model_used']} prediction for {loc['name']}: {prediction['risk_category']} ({prediction['flood_probability_pct']}%)",
        user.get("email", "analyst@floodshield.ai"),
    )
    return {
        "prediction_id": pred_id,
        "location": loc,
        "input_features": features,
        **prediction,
        "triggered_alerts": triggered_alerts,
        "predicted_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


@app.get("/api/flood/history", tags=["AI/ML Flood Prediction"])
def get_flood_history(location_id: int = Query(default=1)) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM flood_predictions WHERE location_id = ? ORDER BY predicted_at DESC LIMIT 30",
            (location_id,),
        )
        preds = rows_to_dicts(cur.fetchall())
        for p in preds:
            p["input_features"] = json.loads(p["input_features_json"])
            p["explanation"] = json.loads(p["explanation_json"])

        cur.execute("SELECT * FROM flood_events WHERE location_id = ? ORDER BY id DESC", (location_id,))
        events = rows_to_dicts(cur.fetchall())

    return {
        "location_id": location_id,
        "predictions": preds,
        "historical_events": events,
    }


@app.get("/api/flood/models", tags=["AI/ML Flood Prediction"])
def get_flood_models_status() -> Dict[str, Any]:
    return flood_ml_pipeline.get_model_status()


@app.post("/api/flood/retrain", tags=["AI/ML Flood Prediction"])
def retrain_flood_models(
    user: Dict[str, Any] = Depends(require_roles(["Admin", "Analyst"])),
) -> Dict[str, Any]:
    status_out = flood_ml_pipeline.train_all_models(n_samples=1500)
    log_system_event("INFO", "ML_PIPELINE", "Retrained Random Forest, XGBoost, and Logistic Regression models", user["email"])
    return {"status": "retrained", "model_registry": status_out}


# ============================================================================
# 5. WEATHER & RIVER TELEMETRY (/api/weather/*, /api/river/*)
# ============================================================================

@app.get("/api/weather/current", tags=["Weather & River Telemetry"])
def get_current_weather(location_id: int = Query(default=1)) -> Dict[str, Any]:
    loc = _get_location_or_404(location_id)
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM weather_observations WHERE location_id = ? ORDER BY recorded_at DESC LIMIT 1",
            (loc["id"],),
        )
        latest = row_to_dict(cur.fetchone())
    live_weather = latest or weather_service.get_current_weather(loc)
    climate_info = climate_service.get_climate_indicators(loc)
    return {
        "location": loc,
        "current_weather": live_weather,
        "climate_indicators": climate_info,
    }


@app.get("/api/weather/history", tags=["Weather & River Telemetry"])
def get_weather_history(location_id: int = Query(default=1)) -> Dict[str, Any]:
    loc = _get_location_or_404(location_id)
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM weather_observations WHERE location_id = ? ORDER BY recorded_at ASC LIMIT 30",
            (loc["id"],),
        )
        history = rows_to_dicts(cur.fetchall())
    return {"location": loc, "observations": history}


@app.get("/api/river/current", tags=["Weather & River Telemetry"])
def get_current_river(location_id: int = Query(default=1)) -> Dict[str, Any]:
    loc = _get_location_or_404(location_id)
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM river_observations WHERE location_id = ? ORDER BY recorded_at DESC LIMIT 1",
            (loc["id"],),
        )
        latest = row_to_dict(cur.fetchone())
    return {"location": loc, "current_river": latest or water_level_service.get_current_river_status(loc)}


@app.get("/api/river/history", tags=["Weather & River Telemetry"])
def get_river_history(location_id: int = Query(default=1)) -> Dict[str, Any]:
    loc = _get_location_or_404(location_id)
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM river_observations WHERE location_id = ? ORDER BY recorded_at ASC LIMIT 30",
            (loc["id"],),
        )
        history = rows_to_dicts(cur.fetchall())
    return {"location": loc, "observations": history}


# ============================================================================
# 6. REMOTE SENSING & FLOOD EXTENT DETECTION (/api/remote-sensing/*)
# ============================================================================

@app.post("/api/remote-sensing/analyze", tags=["Remote Sensing & NDWI/SAR"])
def analyze_remote_sensing(
    req: RemoteSensingAnalyzeRequest,
    user: Dict[str, Any] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    loc = _get_location_or_404(req.location_id)
    result = remote_sensing_processor.analyze_scene(
        location_id=loc["id"],
        location_name=loc["name"],
        center_lat=loc["latitude"],
        center_lng=loc["longitude"],
        total_basin_area_sq_km=loc["area_sq_km"],
        satellite_type=req.satellite_type,
        green_band_matrix=req.green_band_matrix,
        nir_band_matrix=req.nir_band_matrix,
        sar_vv_db_matrix=req.sar_vv_db_matrix,
        ndwi_threshold=req.ndwi_threshold,
        sar_water_threshold_db=req.sar_water_threshold_db,
        simulated_rainfall_mm=req.simulated_rainfall_mm,
        cloud_cover_pct=req.cloud_cover_pct,
    )
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO satellite_observations (
                location_id, satellite_name, sensor_mode, acquisition_time,
                cloud_cover_pct, mean_ndwi, sar_backscatter_db, water_threshold,
                detected_water_area_sq_km, baseline_water_area_sq_km, flood_anomaly_sq_km,
                inundation_pct, geojson_extent, processing_pipeline
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                loc["id"],
                result["satellite_name"],
                "IW GRD VV+VH / MSI B03-B08",
                result["acquisition_time"],
                result["cloud_cover_pct"],
                result["mean_ndwi"],
                result["sar_backscatter_db"],
                result["water_threshold"],
                result["detected_water_area_sq_km"],
                result["baseline_water_area_sq_km"],
                result["flood_anomaly_sq_km"],
                result["inundation_pct"],
                json.dumps(result["geojson"]),
                json.dumps(result["processing_pipeline"]),
            ),
        )
        obs_id = cur.lastrowid

    log_system_event(
        "INFO",
        "REMOTE_SENSING",
        f"Processed {req.satellite_type} scene for {loc['name']} (Flood anomaly: {result['flood_anomaly_sq_km']} sq.km)",
        user.get("email", "analyst@floodshield.ai"),
    )
    return {"observation_id": obs_id, **result}


@app.get("/api/remote-sensing/observations", tags=["Remote Sensing & NDWI/SAR"])
def get_remote_sensing_observations(location_id: int = Query(default=1)) -> Dict[str, Any]:
    loc = _get_location_or_404(location_id)
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM satellite_observations WHERE location_id = ? ORDER BY id DESC LIMIT 10",
            (loc["id"],),
        )
        rows = rows_to_dicts(cur.fetchall())
        for r in rows:
            r["geojson"] = json.loads(r["geojson_extent"])
            r["processing_pipeline"] = json.loads(r["processing_pipeline"])
    return {"location": loc, "observations": rows}


# ============================================================================
# 7. GIS FLOOD ZONES & MULTI-LAYER MAP (/api/flood-zones, /api/gis/layers)
# ============================================================================

@app.get("/api/flood-zones", tags=["Locations & GIS"])
def get_flood_zones(location_id: int = Query(default=1)) -> Dict[str, Any]:
    loc = _get_location_or_404(location_id)
    with db_cursor() as cur:
        cur.execute("SELECT * FROM flood_zones WHERE location_id = ? ORDER BY risk_score DESC", (loc["id"],))
        zones = rows_to_dicts(cur.fetchall())
        features = []
        for z in zones:
            feat = json.loads(z["geojson_polygon"])
            z["geojson"] = feat
            features.append(feat)

        cur.execute("SELECT * FROM shelters WHERE location_id = ?", (loc["id"],))
        shelters = rows_to_dicts(cur.fetchall())

        cur.execute("SELECT * FROM hospitals WHERE location_id = ?", (loc["id"],))
        hospitals = rows_to_dicts(cur.fetchall())

        cur.execute("SELECT * FROM satellite_observations WHERE location_id = ? ORDER BY id DESC LIMIT 1", (loc["id"],))
        sat = row_to_dict(cur.fetchone())
        sat_geojson = json.loads(sat["geojson_extent"]) if sat else None

    lat, lng = loc["latitude"], loc["longitude"]
    evacuation_points = [
        {"id": 1, "name": f"{loc['district']} Elevated Assembly Point North", "lat": round(lat + 0.029, 5), "lng": round(lng - 0.015, 5), "safe_elevation_m": round(loc["elevation_m"] + 18.0, 1), "route_status": "CLEAR"},
        {"id": 2, "name": f"{loc['district']} Highway Flyover Staging Point", "lat": round(lat - 0.022, 5), "lng": round(lng + 0.019, 5), "safe_elevation_m": round(loc["elevation_m"] + 14.5, 1), "route_status": "CLEAR"},
        {"id": 3, "name": f"{loc['district']} Eastern Hillock Heli-Pad & Staging Zone", "lat": round(lat + 0.016, 5), "lng": round(lng + 0.035, 5), "safe_elevation_m": round(loc["elevation_m"] + 24.0, 1), "route_status": "CLEAR"},
    ]

    evacuation_routes = [
        {
            "id": "route-north",
            "name": "Zone A Core Floodplain -> Govt. Engineering College Shelter Corridor",
            "status": "OPEN_HIGH_PRIORITY",
            "distance_km": 4.2,
            "estimated_time_min": 14,
            "coordinates": [
                [round(lat + 0.004, 5), round(lng - 0.006, 5)],
                [round(lat + 0.014, 5), round(lng - 0.012, 5)],
                [round(lat + 0.025, 5), round(lng - 0.018, 5)],
            ],
        },
        {
            "id": "route-south",
            "name": "Zone C Drainage Basin -> Municipal Indoor Stadium Safe Route",
            "status": "OPEN",
            "distance_km": 3.6,
            "estimated_time_min": 11,
            "coordinates": [
                [round(lat - 0.008, 5), round(lng + 0.005, 5)],
                [round(lat - 0.014, 5), round(lng + 0.013, 5)],
                [round(lat - 0.019, 5), round(lng + 0.021, 5)],
            ],
        },
    ]

    return {
        "location": loc,
        "flood_zones": zones,
        "geojson_feature_collection": {
            "type": "FeatureCollection",
            "features": features,
        },
        "remote_sensing_extent": sat_geojson,
        "shelters": shelters,
        "hospitals": hospitals,
        "evacuation_points": evacuation_points,
        "evacuation_routes": evacuation_routes,
    }


# ============================================================================
# 8. POST-FLOOD HEALTH PROTECTION MODULE (/api/health-risk/*)
# ============================================================================

@app.get("/api/health-risk", tags=["Post-Flood Health Protection"])
def get_health_risk(location_id: int = Query(default=1)) -> Dict[str, Any]:
    loc = _get_location_or_404(location_id)
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM health_risk_assessments WHERE location_id = ? ORDER BY id DESC LIMIT 1",
            (loc["id"],),
        )
        row = row_to_dict(cur.fetchone())

    if not row:
        assessed = health_risk_engine.assess_health_risk(
            location_id=loc["id"],
            location_name=loc["name"],
            rainfall_mm=225.0,
            flood_probability=0.86,
            inundation_depth_m=1.8,
            center_lat=loc["latitude"],
            center_lng=loc["longitude"],
        )
        return {"location": loc, **assessed}

    category_breakdown = {
        "water_contamination": row["water_contamination_risk"],
        "diarrheal_disease_risk": row["diarrheal_disease_risk"],
        "mosquito_vector_risk": row["mosquito_vector_risk"],
        "stagnant_water_risk": row["stagnant_water_risk"],
        "sanitation_risk": row["sanitation_risk"],
        "drinking_water_risk": row["drinking_water_risk"],
        "heat_dehydration_risk": row["heat_dehydration_risk"],
        "shelter_hygiene_risk": row["shelter_hygiene_risk"],
    }
    return {
        "assessment_id": row["id"],
        "location": loc,
        "disclaimer": MEDICAL_DISCLAIMER,
        "health_risk_score": row["health_risk_score"],
        "risk_category": row["risk_category"],
        "category_breakdown": category_breakdown,
        "primary_contributing_factors": json.loads(row["contributing_factors_json"]),
        "recommended_actions": json.loads(row["recommended_actions_json"]),
        "priority_areas": json.loads(row["priority_areas_json"]),
        "assessed_at": row["assessed_at"],
    }


@app.post("/api/health-risk/assess", tags=["Post-Flood Health Protection"])
def assess_health_risk(
    req: HealthRiskAssessRequest,
    user: Dict[str, Any] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    loc = _get_location_or_404(req.location_id)
    res = health_risk_engine.assess_health_risk(
        location_id=loc["id"],
        location_name=loc["name"],
        rainfall_mm=req.rainfall_mm,
        flood_probability=req.flood_probability,
        inundation_depth_m=req.inundation_depth_m,
        stagnant_water_days=req.stagnant_water_days,
        temperature_c=req.temperature_c,
        humidity_pct=req.humidity_pct,
        sanitation_disruption_pct=req.sanitation_disruption_pct,
        safe_water_access_pct=req.safe_water_access_pct,
        shelter_crowd_index=req.shelter_crowd_index,
        drainage_index=loc["drainage_index"],
        center_lat=loc["latitude"],
        center_lng=loc["longitude"],
    )
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO health_risk_assessments (
                location_id, zone_id, health_risk_score, risk_category,
                water_contamination_risk, diarrheal_disease_risk, mosquito_vector_risk,
                stagnant_water_risk, sanitation_risk, drinking_water_risk,
                heat_dehydration_risk, shelter_hygiene_risk,
                contributing_factors_json, recommended_actions_json, priority_areas_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                loc["id"],
                1,
                res["health_risk_score"],
                res["risk_category"],
                res["category_breakdown"]["water_contamination"],
                res["category_breakdown"]["diarrheal_disease_risk"],
                res["category_breakdown"]["mosquito_vector_risk"],
                res["category_breakdown"]["stagnant_water_risk"],
                res["category_breakdown"]["sanitation_risk"],
                res["category_breakdown"]["drinking_water_risk"],
                res["category_breakdown"]["heat_dehydration_risk"],
                res["category_breakdown"]["shelter_hygiene_risk"],
                json.dumps(res["primary_contributing_factors"]),
                json.dumps(res["recommended_actions"]),
                json.dumps(res["priority_areas"]),
            ),
        )
        new_id = cur.lastrowid

    log_system_event(
        "INFO",
        "HEALTH_PROTECTION",
        f"Assessed Post-Flood Health Risk for {loc['name']}: {res['risk_category']} ({res['health_risk_score']}/100)",
        user.get("email", "health@floodshield.ai"),
    )
    return {"assessment_id": new_id, "location": loc, **res}


# ============================================================================
# 9. ALERT SYSTEM (/api/alerts/*)
# ============================================================================

@app.get("/api/alerts", tags=["Alert Engine"])
def list_alerts(
    location_id: Optional[int] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    active_only: bool = Query(default=False),
) -> Dict[str, Any]:
    query = "SELECT a.*, l.name as location_name, l.district FROM alerts a JOIN locations l ON a.location_id = l.id WHERE 1=1"
    params: List[Any] = []
    if location_id is not None:
        query += " AND a.location_id = ?"
        params.append(location_id)
    if severity:
        query += " AND a.severity = ?"
        params.append(severity.upper())
    if active_only:
        query += " AND a.is_active = 1"
    query += " ORDER BY a.id DESC"

    with db_cursor() as cur:
        cur.execute(query, tuple(params))
        alerts = rows_to_dicts(cur.fetchall())
        cur.execute("SELECT * FROM alert_thresholds ORDER BY id ASC")
        thresholds = rows_to_dicts(cur.fetchall())

    return {"count": len(alerts), "alerts": alerts, "thresholds": thresholds}


@app.post("/api/alerts", status_code=status.HTTP_201_CREATED, tags=["Alert Engine"])
def create_alert(
    req: AlertCreateRequest,
    user: Dict[str, Any] = Depends(require_roles(["Admin", "Disaster Management Officer", "Health Officer"])),
) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO alerts (
                location_id, alert_type, severity, title, message,
                recommended_action, trigger_metric, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
            (
                req.location_id,
                req.alert_type,
                req.severity.upper(),
                req.title,
                req.message,
                req.recommended_action,
                req.trigger_metric,
            ),
        )
        new_id = cur.lastrowid
        cur.execute("SELECT * FROM alerts WHERE id = ?", (new_id,))
        alert = row_to_dict(cur.fetchone())

    log_system_event("WARNING", "ALERT_ENGINE", f"Created {req.severity} {req.alert_type}: {req.title}", user["email"])
    return {"alert": alert}


@app.post("/api/alerts/{alert_id}/acknowledge", tags=["Alert Engine"])
def acknowledge_alert(
    alert_id: int,
    user: Dict[str, Any] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute(
            "UPDATE alerts SET is_active = 0, acknowledged_by = ? WHERE id = ?",
            (user.get("email", "dmo@floodshield.ai"), alert_id),
        )
        cur.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
        alert = row_to_dict(cur.fetchone())
    log_system_event("INFO", "ALERT_ENGINE", f"Acknowledged alert #{alert_id}", user.get("email", "dmo@floodshield.ai"))
    return {"alert": alert}


@app.put("/api/alerts/thresholds/{threshold_id}", tags=["Alert Engine"])
def update_alert_threshold(
    threshold_id: int,
    req: ThresholdUpdateRequest,
    user: Dict[str, Any] = Depends(require_roles(["Admin", "Disaster Management Officer"])),
) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute(
            """UPDATE alert_thresholds
               SET warning_threshold = ?, high_threshold = ?, critical_threshold = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (req.warning_threshold, req.high_threshold, req.critical_threshold, threshold_id),
        )
        cur.execute("SELECT * FROM alert_thresholds WHERE id = ?", (threshold_id,))
        updated = row_to_dict(cur.fetchone())
    log_system_event("INFO", "THRESHOLDS", f"Updated alert threshold #{threshold_id}", user["email"])
    return {"threshold": updated}


# ============================================================================
# 10. EVACUATION & EMERGENCY RESPONSE (/api/response/*)
# ============================================================================

@app.get("/api/response/overview", tags=["Emergency Response"])
def get_emergency_response(location_id: int = Query(default=1)) -> Dict[str, Any]:
    loc = _get_location_or_404(location_id)
    with db_cursor() as cur:
        cur.execute("SELECT * FROM shelters WHERE location_id = ? ORDER BY id ASC", (loc["id"],))
        shelters = rows_to_dicts(cur.fetchall())

        cur.execute("SELECT * FROM hospitals WHERE location_id = ? ORDER BY id ASC", (loc["id"],))
        hospitals = rows_to_dicts(cur.fetchall())

        cur.execute("SELECT * FROM emergency_resources WHERE location_id = ? ORDER BY id ASC", (loc["id"],))
        resources = rows_to_dicts(cur.fetchall())

        cur.execute("SELECT * FROM flood_zones WHERE location_id = ?", (loc["id"],))
        zones = rows_to_dicts(cur.fetchall())

    total_shelter_cap = sum(s["capacity"] for s in shelters)
    total_occupancy = sum(s["current_occupancy"] for s in shelters)
    total_pop_at_risk = sum(z["population_at_risk"] for z in zones)

    emergency_contacts = [
        {"agency": "District Emergency Operations Center (DEOC)", "commander": "Meenakshi Sundaram, IAS", "hotline": "1077 / 04324-256000", "status": "24x7 ACTIVE"},
        {"agency": "NDRF 4th Battalion Flood Rescue Control", "commander": "Comdt. Vikram Rathore", "hotline": "+91-9443100999", "status": "DEPLOYED"},
        {"agency": "Post-Flood Public Health & Epidemic Control Cell", "commander": "Dr. Priya Darshini, MD", "hotline": "104 / +91-9443033445", "status": "ACTIVE"},
        {"agency": "Central Water Commission (CWC) Flood Forecasting", "commander": "Er. S. Venkataraman", "hotline": "0431-2414226", "status": "TELEMETRY ONLINE"},
    ]

    return {
        "location": loc,
        "summary": {
            "affected_population": total_pop_at_risk,
            "evacuated_to_shelters": total_occupancy,
            "total_shelter_capacity": total_shelter_cap,
            "shelter_utilization_pct": round((total_occupancy / max(total_shelter_cap, 1)) * 100.0, 1),
            "hospitals_online": len(hospitals),
            "total_available_beds": sum(h["available_beds"] for h in hospitals),
            "total_icu_beds": sum(h["icu_beds_available"] for h in hospitals),
            "total_ambulances": sum(h["ambulances_available"] for h in hospitals),
            "response_status": "LEVEL-3 FULL ACTIVATION",
        },
        "shelters": shelters,
        "hospitals": hospitals,
        "resources": resources,
        "emergency_contacts": emergency_contacts,
    }


@app.put("/api/response/shelters/{shelter_id}", tags=["Emergency Response"])
def update_shelter(
    shelter_id: int,
    req: ShelterUpdateRequest,
    user: Dict[str, Any] = Depends(require_roles(["Admin", "Disaster Management Officer", "Health Officer"])),
) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute(
            """UPDATE shelters
               SET current_occupancy = ?, water_supply_status = ?, sanitation_status = ?, status = ?
               WHERE id = ?""",
            (req.current_occupancy, req.water_supply_status, req.sanitation_status, req.status, shelter_id),
        )
        cur.execute("SELECT * FROM shelters WHERE id = ?", (shelter_id,))
        shelter = row_to_dict(cur.fetchone())
    log_system_event("INFO", "RESPONSE", f"Updated shelter #{shelter_id} occupancy/status", user["email"])
    return {"shelter": shelter}


@app.put("/api/response/resources/{resource_id}", tags=["Emergency Response"])
def update_resource(
    resource_id: int,
    req: ResourceUpdateRequest,
    user: Dict[str, Any] = Depends(require_roles(["Admin", "Disaster Management Officer"])),
) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute(
            """UPDATE emergency_resources
               SET deployed_quantity = ?, available_quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (req.deployed_quantity, req.available_quantity, req.status, resource_id),
        )
        cur.execute("SELECT * FROM emergency_resources WHERE id = ?", (resource_id,))
        res = row_to_dict(cur.fetchone())
    log_system_event("INFO", "RESPONSE", f"Updated resource #{resource_id} allocation", user["email"])
    return {"resource": res}


# ============================================================================
# 11. ANALYTICS, REPORTS, DATA MANAGEMENT & ADMIN (/api/analytics, /api/reports, /api/admin)
# ============================================================================

@app.get("/api/analytics/overview", tags=["Analytics & Reports"])
def get_analytics_overview() -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM locations ORDER BY id ASC")
        locs = rows_to_dicts(cur.fetchall())

        basin_comparison = []
        for l in locs:
            cur.execute(
                "SELECT * FROM weather_observations WHERE location_id = ? ORDER BY recorded_at DESC LIMIT 1",
                (l["id"],),
            )
            w = row_to_dict(cur.fetchone())
            cur.execute(
                "SELECT * FROM flood_predictions WHERE location_id = ? ORDER BY predicted_at DESC LIMIT 1",
                (l["id"],),
            )
            p = row_to_dict(cur.fetchone())
            cur.execute(
                "SELECT * FROM health_risk_assessments WHERE location_id = ? ORDER BY id DESC LIMIT 1",
                (l["id"],),
            )
            h = row_to_dict(cur.fetchone())
            cur.execute(
                "SELECT * FROM satellite_observations WHERE location_id = ? ORDER BY id DESC LIMIT 1",
                (l["id"],),
            )
            s = row_to_dict(cur.fetchone())

            basin_comparison.append({
                "location_id": l["id"],
                "name": l["name"],
                "district": l["district"],
                "state": l["state"],
                "rainfall_mm": w["rainfall_mm"] if w else 180.0,
                "flood_probability_pct": round(p["flood_probability"] * 100.0, 1) if p else 75.0,
                "flood_risk_category": p["risk_category"] if p else "HIGH",
                "health_risk_score": h["health_risk_score"] if h else 72.0,
                "inundated_area_sq_km": s["detected_water_area_sq_km"] if s else 24.5,
                "population_at_risk": p["estimated_population_at_risk"] if p else 32000,
            })

    return {
        "basin_comparison": basin_comparison,
        "ml_benchmarks": flood_ml_pipeline.get_model_status(),
        "seasonal_profile": [
            {"month": "Jun", "avg_rainfall_mm": 68, "historical_floods": 1, "health_index": 28},
            {"month": "Jul", "avg_rainfall_mm": 112, "historical_floods": 2, "health_index": 36},
            {"month": "Aug", "avg_rainfall_mm": 138, "historical_floods": 3, "health_index": 44},
            {"month": "Sep", "avg_rainfall_mm": 154, "historical_floods": 3, "health_index": 51},
            {"month": "Oct", "avg_rainfall_mm": 218, "historical_floods": 6, "health_index": 72},
            {"month": "Nov", "avg_rainfall_mm": 246, "historical_floods": 8, "health_index": 81},
            {"month": "Dec", "avg_rainfall_mm": 142, "historical_floods": 4, "health_index": 58},
        ],
    }


@app.get("/api/reports/generate", tags=["Analytics & Reports"])
def generate_situation_report(location_id: int = Query(default=1)) -> Dict[str, Any]:
    summary = get_dashboard_summary(location_id=location_id)
    health = get_health_risk(location_id=location_id)
    response = get_emergency_response(location_id=location_id)
    rs = get_remote_sensing_observations(location_id=location_id)
    latest_rs = rs["observations"][0] if rs["observations"] else {}

    loc = summary["location"]
    kpis = summary["kpis"]
    report_id = f"FS-SITREP-{loc['id']}-{datetime.utcnow().strftime('%Y%m%d%H%M')}"

    markdown_content = f"""# FLOODSHIELD AI — OFFICIAL DISASTER & POST-FLOOD HEALTH SITUATION REPORT
**Report ID:** `{report_id}`  
**Generated At:** `{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}`  
**Monitored Basin:** {loc['name']} ({loc['district']}, {loc['state']})  
**Prepared By:** Team Digital Pioneer — FloodShield AI Command System  

## 1. Executive Hydro-Meteorological & Flood Risk Summary
- **Current Flood Risk Category:** **{kpis['current_flood_risk']}** (Risk Score: {kpis['flood_risk_score']}/100, AI Probability: {kpis['flood_probability_pct']}%)
- **24-Hour Cumulative Rainfall:** {kpis['rainfall_mm']} mm (Peak Intensity: {kpis['rainfall_intensity_mm_hr']} mm/hr)
- **River Gauge Stage:** {kpis['river_level_m']} m (Warning: {kpis['warning_level_m']} m | Danger: {kpis['danger_level_m']} m | Trend: {kpis['river_trend']})
- **Estimated Inundated Area:** {kpis['affected_area_sq_km']} sq.km
- **Estimated Population at Risk:** {kpis['population_at_risk']:,} residents

## 2. Remote Sensing (Sentinel-1 SAR + Sentinel-2 NDWI) Assessment
- **Satellite Sensor:** {latest_rs.get('satellite_name', 'Sentinel-2 MSI + Sentinel-1 SAR Fusion')}
- **Mean NDWI / SAR Backscatter:** NDWI = {latest_rs.get('mean_ndwi', 0.28)} | SAR VV = {latest_rs.get('sar_backscatter_db', -17.4)} dB
- **Detected Active Flood Anomaly:** {latest_rs.get('flood_anomaly_sq_km', 18.4)} sq.km ({latest_rs.get('inundation_pct', 24.5)}% of basin)

## 3. Post-Flood Environmental Health Protection Assessment
> {health['disclaimer']}
- **Overall Health Risk Category:** **{health['risk_category']}** (Score: {health['health_risk_score']}/100)
- **Water Contamination Risk:** {health['category_breakdown']['water_contamination']}/100
- **Diarrheal Disease Environmental Risk:** {health['category_breakdown']['diarrheal_disease_risk']}/100
- **Mosquito / Vector Proliferation Risk:** {health['category_breakdown']['mosquito_vector_risk']}/100
- **Sanitation Disruption Risk:** {health['category_breakdown']['sanitation_risk']}/100
- **Recommended Public-Health Actions:**
{chr(10).join('  - ' + act for act in health['recommended_actions'])}

## 4. Evacuation & Emergency Response Status
- **Active Relief Shelters:** {len(response['shelters'])} ({response['summary']['evacuated_to_shelters']:,} / {response['summary']['total_shelter_capacity']:,} occupancy — {response['summary']['shelter_utilization_pct']}%)
- **Hospitals Online:** {response['summary']['hospitals_online']} (Available Beds: {response['summary']['total_available_beds']}, ICU Beds: {response['summary']['total_icu_beds']}, Ambulances: {response['summary']['total_ambulances']})
"""
    return {
        "report_id": report_id,
        "generated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "location": loc,
        "kpis": kpis,
        "health_assessment": health,
        "emergency_response": response["summary"],
        "remote_sensing": latest_rs,
        "markdown_report": markdown_content,
    }


@app.get("/api/data/datasets", tags=["Data Management"])
def list_datasets() -> Dict[str, Any]:
    with db_cursor() as cur:
        table_counts = {}
        for tbl in [
            "locations", "weather_observations", "river_observations",
            "flood_predictions", "flood_zones", "health_risk_assessments",
            "alerts", "shelters", "hospitals", "emergency_resources",
            "satellite_observations", "users",
        ]:
            cur.execute(f"SELECT COUNT(*) as c FROM {tbl}")
            table_counts[tbl] = cur.fetchone()["c"]

    return {
        "datasets": [
            {
                "id": "ds-flood-ml-train",
                "name": "Hydro-Meteorological Flood Training Dataset (CSV)",
                "path": "data/sample/flood_training_dataset.csv",
                "records": 1500,
                "features": 11,
                "format": "CSV",
                "description": "1,500 labeled basin observations across rainfall, intensity, river stage, soil moisture, elevation, slope, drainage index, and historical floods.",
            },
            {
                "id": "ds-geojson-zones",
                "name": "Multi-Basin Flood Risk & Health Protection GeoJSON Layers",
                "path": "data/geojson/flood_risk_zones.geojson",
                "records": table_counts["flood_zones"],
                "features": 8,
                "format": "GeoJSON",
                "description": "Vector polygons for Critical, Severe, High, and Moderate flood and post-flood health risk zones.",
            },
            {
                "id": "ds-sentinel-ndwi",
                "name": "Sentinel-1 SAR & Sentinel-2 MSI NDWI Water Extent Scenes",
                "path": "data/sample/sentinel_ndwi_scenes.json",
                "records": table_counts["satellite_observations"],
                "features": 14,
                "format": "JSON / Raster Matrix",
                "description": "Preprocessed optical Band 3/8 reflectance and C-band SAR VV backscatter matrices for water-extent extraction.",
            },
        ],
        "database_table_counts": table_counts,
    }


@app.get("/api/admin/users", tags=["Admin Panel"])
def admin_list_users(user: Dict[str, Any] = Depends(get_current_user_optional)) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute("SELECT id, full_name, email, role_id, role_name, organization, phone, assigned_location_id, is_active, created_at, last_login FROM users ORDER BY id ASC")
        users = rows_to_dicts(cur.fetchall())
        cur.execute("SELECT * FROM roles ORDER BY id ASC")
        roles = rows_to_dicts(cur.fetchall())
    return {"users": users, "roles": roles}


@app.put("/api/admin/users/{user_id}", tags=["Admin Panel"])
def admin_update_user(
    user_id: int,
    req: UserUpdateRequest,
    admin_user: Dict[str, Any] = Depends(require_roles(["Admin"])),
) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        target = row_to_dict(cur.fetchone())
        if not target:
            raise HTTPException(status_code=404, detail="User not found")

        new_role_name = req.role_name or target["role_name"]
        cur.execute("SELECT id FROM roles WHERE name = ?", (new_role_name,))
        r_row = row_to_dict(cur.fetchone())
        new_role_id = r_row["id"] if r_row else target["role_id"]

        cur.execute(
            """UPDATE users
               SET full_name = ?, role_id = ?, role_name = ?, organization = ?,
                   phone = ?, assigned_location_id = ?, is_active = ?
               WHERE id = ?""",
            (
                req.full_name if req.full_name is not None else target["full_name"],
                new_role_id,
                new_role_name,
                req.organization if req.organization is not None else target["organization"],
                req.phone if req.phone is not None else target["phone"],
                req.assigned_location_id if req.assigned_location_id is not None else target["assigned_location_id"],
                1 if (req.is_active if req.is_active is not None else target["is_active"]) else 0,
                user_id,
            ),
        )
        cur.execute("SELECT id, full_name, email, role_id, role_name, organization, phone, assigned_location_id, is_active, created_at, last_login FROM users WHERE id = ?", (user_id,))
        updated = row_to_dict(cur.fetchone())

    log_system_event("INFO", "ADMIN", f"Updated user #{user_id} ({updated['email']}) role={updated['role_name']}", admin_user["email"])
    return {"user": updated}


@app.get("/api/admin/logs", tags=["Admin Panel"])
def admin_get_logs() -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM system_logs ORDER BY id DESC LIMIT 100")
        logs = rows_to_dicts(cur.fetchall())
    return {"count": len(logs), "logs": logs}
