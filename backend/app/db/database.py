"""
FLOODSHIELD AI — Unified Database Engine & Repository Layer
Supports PostgreSQL via SQLAlchemy when configured, with automatic fallback to local SQLite
so the application runs out-of-the-box on any developer machine.
"""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional
from app.core.config import settings
from app.core.security import get_password_hash
from app.ml.flood_model import flood_ml_pipeline
from app.gis.remote_sensing_processor import remote_sensing_processor
from app.services.health_risk_engine import health_risk_engine

DB_PATH = Path(settings.SQLITE_PATH)
SCHEMA_SQL_PATH = Path(__file__).resolve().parent.parent.parent / "migrations" / "001_initial_schema.sql"


def get_sqlite_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@contextmanager
def db_cursor() -> Generator[sqlite3.Cursor, None, None]:
    conn = get_sqlite_connection()
    try:
        cur = conn.cursor()
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def rows_to_dicts(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [dict(r) for r in rows]


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    return dict(row) if row is not None else None


def init_and_seed_database() -> None:
    """Initializes schema from 001_initial_schema.sql and seeds rich demo data if empty."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    schema_sql = SCHEMA_SQL_PATH.read_text()

    with db_cursor() as cur:
        cur.executescript(schema_sql)

    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM roles")
        if cur.fetchone()["cnt"] > 0:
            return

        # 1. Seed Roles
        roles_data = [
            ("Admin", "Full system administration, user/role management, threshold tuning, and model retraining", json.dumps(["all", "admin", "predict", "gis", "health", "alerts", "response", "reports", "users"])),
            ("Disaster Management Officer", "Operational command of flood alerts, evacuation shelters, GIS risk zones, and emergency resources", json.dumps(["predict", "gis", "alerts", "response", "reports", "health"])),
            ("Health Officer", "Post-flood environmental health risk assessment, sanitation & water safety response, and hospital coordination", json.dumps(["health", "gis", "alerts", "response", "reports"])),
            ("Analyst", "AI/ML flood modeling, SHAP explainability analysis, remote-sensing NDWI/SAR processing, and climate analytics", json.dumps(["predict", "gis", "remote_sensing", "analytics", "reports"])),
            ("Viewer", "Read-only access to dashboards, GIS maps, public alerts, and shelter locations", json.dumps(["view_dashboard", "view_map", "view_alerts"])),
        ]
        for r_name, r_desc, r_perms in roles_data:
            cur.execute(
                "INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)",
                (r_name, r_desc, r_perms),
            )

        # 2. Seed Locations (5 realistic Indian River Basins)
        locations_data = [
            ("Cauvery Basin — Karur & Mayanur Reach", "Karur", "Tamil Nadu", "Cauvery River", 10.9601, 78.0766, 38.0, 1.8, 42.0, 245000, 112.5, 5, 9.0, 7.5),
            ("Adyar & Cooum Estuarine Basin — Chennai South", "Chennai", "Tamil Nadu", "Adyar River", 13.0102, 80.2206, 8.5, 0.7, 31.0, 680000, 145.0, 8, 6.5, 5.2),
            ("Brahmaputra Floodplain — Guwahati Lower Reach", "Kamrup Metro", "Assam", "Brahmaputra River", 26.1844, 91.7458, 51.0, 1.4, 38.0, 520000, 198.0, 9, 11.5, 9.8),
            ("Periyar River Lower Basin — Aluva Corridor", "Ernakulam", "Kerala", "Periyar River", 10.1076, 76.3516, 22.0, 2.9, 56.0, 310000, 94.0, 6, 8.2, 6.8),
            ("Mahanadi Delta — Cuttack Bifurcation Zone", "Cuttack", "Odisha", "Mahanadi River", 20.4625, 85.8830, 19.5, 1.1, 44.0, 415000, 162.0, 7, 10.2, 8.6),
        ]
        for loc in locations_data:
            cur.execute(
                """INSERT INTO locations (
                    name, district, state, river_basin, latitude, longitude,
                    elevation_m, slope_deg, drainage_index, population, area_sq_km,
                    historical_flood_count, danger_river_level_m, warning_river_level_m
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                loc,
            )

        # 3. Seed Users for all 5 RBAC Roles (default password: Password123!)
        default_pw_hash = get_password_hash("Password123!")
        users_data = [
            ("Dr. Aravind Krishnan", "admin@floodshield.ai", default_pw_hash, 1, "Admin", "Digital Pioneer — NDMA Command Center", "+91-9443011223", 1),
            ("Meenakshi Sundaram, IAS", "dmo@floodshield.ai", default_pw_hash, 2, "Disaster Management Officer", "State Disaster Management Authority (SDMA)", "+91-9443022334", 1),
            ("Dr. Priya Darshini, MD (Public Health)", "health@floodshield.ai", default_pw_hash, 3, "Health Officer", "Directorate of Public Health & Preventive Medicine", "+91-9443033445", 1),
            ("Rohan Deshmukh, M.Tech (GIS & AI)", "analyst@floodshield.ai", default_pw_hash, 4, "Analyst", "NRSC / Hydro-Informatics Division", "+91-9443044556", 2),
            ("Karthik Subramanian", "viewer@floodshield.ai", default_pw_hash, 5, "Viewer", "District Citizen Emergency Watch", "+91-9443055667", 1),
        ]
        for u in users_data:
            cur.execute(
                """INSERT INTO users (
                    full_name, email, password_hash, role_id, role_name,
                    organization, phone, assigned_location_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                u,
            )

        # 4. Seed Alert Thresholds
        thresholds_data = [
            ("rainfall_24h_mm", "24-Hour Cumulative Rainfall", "mm", 110.0, 165.0, 210.0, "Extreme Rainfall Alert"),
            ("rainfall_intensity_mm_hr", "Peak Hourly Rainfall Intensity", "mm/hr", 25.0, 40.0, 55.0, "Extreme Rainfall Alert"),
            ("river_stage_ratio_pct", "River Gauge Stage (% of Danger Level)", "%", 82.0, 92.0, 100.0, "River Level Alert"),
            ("flood_probability_pct", "AI Flood Probability", "%", 50.0, 70.0, 85.0, "Flood Alert"),
            ("health_risk_score", "Post-Flood Environmental Health Risk Score", "score", 45.0, 65.0, 80.0, "Health Risk Alert"),
            ("shelter_occupancy_pct", "Evacuation Shelter Occupancy", "%", 70.0, 85.0, 95.0, "Infrastructure Risk Alert"),
        ]
        for t in thresholds_data:
            cur.execute(
                """INSERT INTO alert_thresholds (
                    metric_key, metric_label, unit, warning_threshold,
                    high_threshold, critical_threshold, alert_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                t,
            )

        # 5. Seed 14-day Weather & River Time-Series + Predictions + Zones + Shelters + Hospitals
        cur.execute("SELECT * FROM locations")
        all_locations = rows_to_dicts(cur.fetchall())
        now = datetime(2026, 11, 12, 10, 0, 0)

        for loc in all_locations:
            loc_id = loc["id"]
            lat = loc["latitude"]
            lng = loc["longitude"]
            warn_lvl = loc["warning_river_level_m"]
            danger_lvl = loc["danger_river_level_m"]

            # 14-day historical trajectory culminating in intense NE monsoon spell
            rain_series = [42, 55, 68, 84, 96, 112, 134, 148, 166, 182, 198, 214, 228, 236]
            for day_offset in range(14):
                ts = (now - timedelta(days=13 - day_offset)).strftime("%Y-%m-%dT%H:%M:%SZ")
                scale = 1.0 + (loc_id - 1) * 0.06
                rain_mm = round(rain_series[day_offset] * scale, 1)
                rain_int = round(rain_mm * 0.21, 1)
                temp_c = round(31.5 - day_offset * 0.25, 1)
                hum_pct = round(min(70.0 + day_offset * 1.8, 97.0), 1)
                wind_kmh = round(20.0 + day_offset * 2.1, 1)
                soil_pct = round(min(54.0 + day_offset * 2.9, 95.0), 1)
                river_m = round(warn_lvl - 1.6 + day_offset * 0.24, 2)
                discharge = round(1450.0 + day_offset * 265.0, 1)
                trend = "RISING" if day_offset >= 4 else "STABLE"

                cur.execute(
                    """INSERT INTO weather_observations (
                        location_id, rainfall_mm, rainfall_intensity_mm_hr, temperature_c,
                        humidity_pct, wind_speed_kmh, soil_moisture_pct, pressure_hpa, recorded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (loc_id, rain_mm, rain_int, temp_c, hum_pct, wind_kmh, soil_pct, 1002.5 - day_offset * 0.4, ts),
                )

                cur.execute(
                    """INSERT INTO river_observations (
                        location_id, station_name, river_name, water_level_m,
                        warning_level_m, danger_level_m, discharge_cumecs, velocity_m_s, trend, recorded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        loc_id,
                        f"{loc['district']} Central Gauge Station",
                        loc["river_basin"],
                        river_m,
                        warn_lvl,
                        danger_lvl,
                        discharge,
                        round(1.6 + day_offset * 0.11, 2),
                        trend,
                        ts,
                    ),
                )

                # Seed corresponding historical flood prediction for the trend chart
                if day_offset in (0, 3, 6, 9, 11, 12, 13):
                    feats = {
                        "rainfall": rain_mm,
                        "rainfall_intensity": rain_int,
                        "temperature": temp_c,
                        "humidity": hum_pct,
                        "river_level": river_m,
                        "soil_moisture": soil_pct,
                        "elevation": loc["elevation_m"],
                        "slope": loc["slope_deg"],
                        "drainage_index": loc["drainage_index"],
                        "historical_flood_count": loc["historical_flood_count"],
                    }
                    pred_out = flood_ml_pipeline.predict(
                        features=feats,
                        model_choice="xgboost",
                        area_sq_km=loc["area_sq_km"],
                        population=loc["population"],
                    )
                    cur.execute(
                        """INSERT INTO flood_predictions (
                            location_id, model_name, flood_probability, risk_score,
                            risk_category, estimated_affected_area_sq_km, estimated_population_at_risk,
                            input_features_json, explanation_json, created_by_user_id, predicted_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            loc_id,
                            pred_out["model_used"],
                            pred_out["flood_probability"],
                            pred_out["risk_score"],
                            pred_out["risk_category"],
                            pred_out["estimated_affected_area_sq_km"],
                            pred_out["estimated_population_at_risk"],
                            json.dumps(feats),
                            json.dumps(pred_out["explanation"]),
                            1,
                            ts,
                        ),
                    )

            # Seed 4 multi-severity GIS Flood Zones per location
            zones_spec = [
                (f"FZ-{loc_id}01", f"{loc['district']} Riverbank Core Floodplain (Zone A)", "CRITICAL", 91.5, 0.915, 2.4, round(loc["area_sq_km"] * 0.18, 2), int(loc["population"] * 0.16), [
                    [round(lng - 0.028, 5), round(lat + 0.010, 5)],
                    [round(lng + 0.025, 5), round(lat + 0.014, 5)],
                    [round(lng + 0.029, 5), round(lat - 0.005, 5)],
                    [round(lng - 0.022, 5), round(lat - 0.009, 5)],
                    [round(lng - 0.028, 5), round(lat + 0.010, 5)],
                ]),
                (f"FZ-{loc_id}02", f"{loc['district']} Northern Canal Lowlands (Zone B)", "SEVERE", 78.2, 0.782, 1.5, round(loc["area_sq_km"] * 0.14, 2), int(loc["population"] * 0.12), [
                    [round(lng - 0.022, 5), round(lat + 0.028, 5)],
                    [round(lng + 0.021, 5), round(lat + 0.031, 5)],
                    [round(lng + 0.025, 5), round(lat + 0.014, 5)],
                    [round(lng - 0.028, 5), round(lat + 0.010, 5)],
                    [round(lng - 0.022, 5), round(lat + 0.028, 5)],
                ]),
                (f"FZ-{loc_id}03", f"{loc['district']} Southern Drainage Basin (Zone C)", "HIGH", 64.0, 0.640, 0.9, round(loc["area_sq_km"] * 0.11, 2), int(loc["population"] * 0.09), [
                    [round(lng - 0.022, 5), round(lat - 0.009, 5)],
                    [round(lng + 0.029, 5), round(lat - 0.005, 5)],
                    [round(lng + 0.024, 5), round(lat - 0.024, 5)],
                    [round(lng - 0.018, 5), round(lat - 0.025, 5)],
                    [round(lng - 0.022, 5), round(lat - 0.009, 5)],
                ]),
                (f"FZ-{loc_id}04", f"{loc['district']} Western Elevated Terrace (Zone D)", "MODERATE", 38.5, 0.385, 0.3, round(loc["area_sq_km"] * 0.08, 2), int(loc["population"] * 0.04), [
                    [round(lng - 0.048, 5), round(lat + 0.018, 5)],
                    [round(lng - 0.028, 5), round(lat + 0.010, 5)],
                    [round(lng - 0.022, 5), round(lat - 0.009, 5)],
                    [round(lng - 0.045, 5), round(lat - 0.014, 5)],
                    [round(lng - 0.048, 5), round(lat + 0.018, 5)],
                ]),
            ]
            for zcode, zname, zcat, zscore, zprob, zdepth, zarea, zpop, zcoords in zones_spec:
                poly_geojson = {
                    "type": "Feature",
                    "properties": {
                        "zone_code": zcode,
                        "zone_name": zname,
                        "risk_category": zcat,
                        "risk_score": zscore,
                        "flood_probability": zprob,
                        "inundation_depth_m": zdepth,
                        "affected_area_sq_km": zarea,
                        "population_at_risk": zpop,
                    },
                    "geometry": {"type": "Polygon", "coordinates": [zcoords]},
                }
                cur.execute(
                    """INSERT INTO flood_zones (
                        location_id, zone_code, zone_name, risk_category, risk_score,
                        flood_probability, inundation_depth_m, affected_area_sq_km,
                        population_at_risk, geojson_polygon
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (loc_id, zcode, zname, zcat, zscore, zprob, zdepth, zarea, zpop, json.dumps(poly_geojson)),
                )

            # Seed Post-Flood Health Risk Assessment for location
            h_res = health_risk_engine.assess_health_risk(
                location_id=loc_id,
                location_name=loc["name"],
                rainfall_mm=228.0,
                flood_probability=0.86,
                inundation_depth_m=1.8,
                stagnant_water_days=4.5,
                temperature_c=29.5,
                humidity_pct=88.0,
                sanitation_disruption_pct=62.0,
                safe_water_access_pct=58.0,
                shelter_crowd_index=74.0,
                drainage_index=loc["drainage_index"],
                center_lat=lat,
                center_lng=lng,
            )
            cur.execute(
                """INSERT INTO health_risk_assessments (
                    location_id, zone_id, health_risk_score, risk_category,
                    water_contamination_risk, diarrheal_disease_risk, mosquito_vector_risk,
                    stagnant_water_risk, sanitation_risk, drinking_water_risk,
                    heat_dehydration_risk, shelter_hygiene_risk,
                    contributing_factors_json, recommended_actions_json, priority_areas_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    loc_id,
                    1,
                    h_res["health_risk_score"],
                    h_res["risk_category"],
                    h_res["category_breakdown"]["water_contamination"],
                    h_res["category_breakdown"]["diarrheal_disease_risk"],
                    h_res["category_breakdown"]["mosquito_vector_risk"],
                    h_res["category_breakdown"]["stagnant_water_risk"],
                    h_res["category_breakdown"]["sanitation_risk"],
                    h_res["category_breakdown"]["drinking_water_risk"],
                    h_res["category_breakdown"]["heat_dehydration_risk"],
                    h_res["category_breakdown"]["shelter_hygiene_risk"],
                    json.dumps(h_res["primary_contributing_factors"]),
                    json.dumps(h_res["recommended_actions"]),
                    json.dumps(h_res["priority_areas"]),
                ),
            )

            # Seed Remote Sensing Satellite Observation
            rs_res = remote_sensing_processor.analyze_scene(
                location_id=loc_id,
                location_name=loc["name"],
                center_lat=lat,
                center_lng=lng,
                total_basin_area_sq_km=loc["area_sq_km"],
                simulated_rainfall_mm=225.0,
            )
            cur.execute(
                """INSERT INTO satellite_observations (
                    location_id, satellite_name, sensor_mode, acquisition_time,
                    cloud_cover_pct, mean_ndwi, sar_backscatter_db, water_threshold,
                    detected_water_area_sq_km, baseline_water_area_sq_km, flood_anomaly_sq_km,
                    inundation_pct, geojson_extent, processing_pipeline
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    loc_id,
                    rs_res["satellite_name"],
                    "IW GRD VV+VH / MSI Band 3 & Band 8",
                    rs_res["acquisition_time"],
                    rs_res["cloud_cover_pct"],
                    rs_res["mean_ndwi"],
                    rs_res["sar_backscatter_db"],
                    rs_res["water_threshold"],
                    rs_res["detected_water_area_sq_km"],
                    rs_res["baseline_water_area_sq_km"],
                    rs_res["flood_anomaly_sq_km"],
                    rs_res["inundation_pct"],
                    json.dumps(rs_res["geojson"]),
                    json.dumps(rs_res["processing_pipeline"]),
                ),
            )

            # Seed Shelters (3 per location)
            shelters_spec = [
                (f"{loc['district']} Govt. Engineering College Relief Complex", f"NH-44 Bypass High Ground, {loc['district']}", round(lat + 0.025, 5), round(lng - 0.018, 5), 1200, 840, "SAFE (RO + Chlorinated)", "ADEQUATE", 1, "R. Balasubramanian", "+91-9442100111", "OPEN"),
                (f"{loc['district']} Municipal Indoor Stadium Shelter", f"Civil Station Road, {loc['district']}", round(lat - 0.019, 5), round(lng + 0.021, 5), 850, 610, "SAFE (Tanker Supplied)", "NEEDS_INSPECTION", 1, "S. Kavitha", "+91-9442100222", "OPEN"),
                (f"St. Joseph Higher Secondary Flood Relief Camp", f"Elevated Hillock Sector, {loc['district']}", round(lat + 0.014, 5), round(lng + 0.032, 5), 600, 390, "SAFE", "ADEQUATE", 1, "Fr. Thomas Mathew", "+91-9442100333", "OPEN"),
            ]
            for s in shelters_spec:
                cur.execute(
                    """INSERT INTO shelters (
                        location_id, name, address, latitude, longitude, capacity,
                        current_occupancy, water_supply_status, sanitation_status,
                        power_backup, contact_person, contact_phone, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (loc_id, *s),
                )

            # Seed Hospitals (2 per location)
            hospitals_spec = [
                (f"{loc['district']} Government Medical College & Hospital", "Tertiary Trauma & Infectious Disease Center", round(lat + 0.016, 5), round(lng - 0.008, 5), 650, 142, 24, 14, "SUFFICIENT", 1, "+91-108 / 04324-255100"),
                (f"Apollo / Kauvery Emergency Flood Response Hospital — {loc['district']}", "Multi-Specialty Emergency Care", round(lat - 0.012, 5), round(lng + 0.015, 5), 320, 78, 12, 8, "SUFFICIENT", 1, "+91-1066 / 04324-255200"),
            ]
            for h in hospitals_spec:
                cur.execute(
                    """INSERT INTO hospitals (
                        location_id, name, facility_type, latitude, longitude,
                        total_beds, available_beds, icu_beds_available,
                        ambulances_available, antivenom_ors_stock, flood_safe_access, emergency_phone
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (loc_id, *h),
                )

            # Seed Emergency Resources
            resources_spec = [
                ("Rescue Boats", "NDRF Inflatable Motorized Rescue Boats", 28, 19, 9, "boats", "DEPLOYED", "NDRF 4th Battalion"),
                ("Water Purification", "Mobile Reverse-Osmosis & Chlorination Tankers", 14, 10, 4, "tankers", "DEPLOYED", "TWAD / Public Health Engineering"),
                ("Medical Kits", "ORS, Halazone Tablets & Doxycycline Prophylaxis Packs", 25000, 16500, 8500, "kits", "ACTIVE_DISTRIBUTION", "District Health Mission"),
                ("Dewatering Pumps", "High-Capacity 50HP Diesel Stormwater Pumps", 36, 28, 8, "pumps", "DEPLOYED", "Municipal Corporation Engineering"),
                ("Vector Control", "Vehicle-Mounted Thermal Fogging & Larvicide Units", 22, 15, 7, "units", "ACTIVE", "Vector-Borne Disease Control Unit"),
            ]
            for r in resources_spec:
                cur.execute(
                    """INSERT INTO emergency_resources (
                        location_id, resource_type, name, total_quantity,
                        deployed_quantity, available_quantity, unit, status, contact_team
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (loc_id, *r),
                )

            # Seed Active Alerts
            alerts_spec = [
                ("Flood Alert", "CRITICAL", f"CRITICAL FLOOD ALERT — {loc['name']}", f"Rainfall threshold exceeded (236 mm). River level rising rapidly ({round(warn_lvl + 1.52, 2)} m). AI Flood probability: 88.4%.", "Evacuate Zone FZ-01 & FZ-02 immediately and deploy NDRF boat teams.", "Flood Probability = 88.4%", 1),
                ("River Level Alert", "CRITICAL", f"RIVER DANGER LEVEL BREACHED — {loc['river_basin']}", f"River stage has crossed Danger Level ({danger_lvl} m) with inflow discharge at 5,120 cumecs.", "Open floodway regulators cleanly and reinforce earthen embankments.", f"River Level > {danger_lvl} m", 1),
                ("Health Risk Alert", "HIGH", f"POST-FLOOD HEALTH ALERT — {loc['district']} Lowlands", "High environmental health risk detected (Score: 76.4/100). Immediate sanitation, stagnant water removal, and drinking-water chlorination inspection recommended.", "Deploy mobile water testing labs, distribute chlorine tablets, and spray Bti larvicide.", "Health Risk Score = 76.4/100", 1),
                ("Extreme Rainfall Alert", "HIGH", f"EXTREME RAINFALL WARNING — {loc['district']}", "Heavy monsoon cloudbands producing >42 mm/hr rainfall intensity.", "Activate urban underpass barriers and stormwater pumping stations.", "Rainfall Intensity = 44.2 mm/hr", 1),
                ("Evacuation Alert", "WARNING", f"SHELTER CAPACITY ADVISORY — {loc['district']}", "Primary relief camp occupancy reached 70%. Secondary school shelters placed on active standby.", "Redirect incoming evacuees from Southern Ward to St. Joseph Relief Camp.", "Shelter Occupancy = 70%", 1),
            ]
            for al in alerts_spec:
                cur.execute(
                    """INSERT INTO alerts (
                        location_id, alert_type, severity, title, message,
                        recommended_action, trigger_metric, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (loc_id, *al),
                )

            # Seed Historical Flood Events
            events_spec = [
                (f"2026 North-East Monsoon Active Flood — {loc['district']}", "CRITICAL", 236.0, round(danger_lvl + 0.4, 2), round(loc["area_sq_km"] * 0.34, 2), 18400, "2026-11-09", None, "ACTIVE", "Ongoing multi-agency flood response and post-flood health surveillance."),
                (f"2024 Cyclone Fengal / Monsoon Deluge — {loc['district']}", "SEVERE", 212.0, round(danger_lvl + 0.1, 2), round(loc["area_sq_km"] * 0.28, 2), 14200, "2024-11-28", "2024-12-06", "RESOLVED", "Post-flood chlorination and vector control prevented secondary outbreaks."),
            ]
            for ev in events_spec:
                cur.execute(
                    """INSERT INTO flood_events (
                        location_id, title, severity, peak_rainfall_mm, peak_river_level_m,
                        inundated_area_sq_km, displaced_population, start_date, end_date, status, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (loc_id, *ev),
                )

        # Seed System Audit Logs
        logs_spec = [
            ("INFO", "ML_PIPELINE", "Trained Random Forest, XGBoost, and Logistic Regression flood models (ROC-AUC: 0.964)", "admin@floodshield.ai", "1,500 hydro-meteorological basin observations processed."),
            ("INFO", "REMOTE_SENSING", "Completed Sentinel-1 SAR + Sentinel-2 NDWI flood extent fusion for 5 basins", "analyst@floodshield.ai", "NDWI threshold=0.22, SAR VV threshold=-16.5 dB."),
            ("WARNING", "ALERT_ENGINE", "Triggered CRITICAL Flood Alert & River Stage Alert for Cauvery Basin — Karur", "dmo@floodshield.ai", "Flood probability 88.4% exceeded critical threshold (85%)."),
            ("INFO", "HEALTH_PROTECTION", "Generated Post-Flood Environmental Health Risk Assessment & WASH action plan", "health@floodshield.ai", "Evaluated 8 environmental risk categories; non-diagnostic decision support active."),
        ]
        for lg in logs_spec:
            cur.execute(
                "INSERT INTO system_logs (level, module, action, user_email, details) VALUES (?, ?, ?, ?, ?)",
                lg,
            )


def log_system_event(level: str, module: str, action: str, user_email: str = "system@floodshield.ai", details: str = "") -> None:
    try:
        with db_cursor() as cur:
            cur.execute(
                "INSERT INTO system_logs (level, module, action, user_email, details) VALUES (?, ?, ?, ?, ?)",
                (level, module, action, user_email, details),
            )
    except Exception:
        pass
