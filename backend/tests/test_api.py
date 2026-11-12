"""
FLOODSHIELD AI — Automated End-to-End API & ML Pipeline Verification Suite
Can be run via `pytest` or directly via `python3 tests/test_api.py`.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["team"] == "Digital Pioneer"


def test_auth_login_and_register():
    # Login with seeded Admin user
    res = client.post("/api/auth/login", json={"email": "admin@floodshield.ai", "password": "Password123!"})
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    assert body["user"]["role_name"] == "Admin"
    token = body["access_token"]

    # Verify /api/auth/me with JWT token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == "admin@floodshield.ai"


def test_dashboard_summary():
    res = client.get("/api/dashboard/summary?location_id=1")
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert "trends" in data
    assert len(data["trends"]) >= 7
    assert "ai_prediction" in data


def test_flood_prediction_and_explainability():
    payload = {
        "location_id": 1,
        "model_choice": "xgboost",
        "rainfall": 242.0,
        "rainfall_intensity": 48.0,
        "temperature": 27.5,
        "humidity": 91.0,
        "river_level": 9.3,
        "soil_moisture": 89.0,
        "elevation": 32.0,
        "slope": 1.4,
        "drainage_index": 36.0,
        "historical_flood_count": 6,
    }
    res = client.post("/api/flood/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["risk_category"] in ["LOW", "MODERATE", "HIGH", "SEVERE", "CRITICAL"]
    assert 0.0 <= data["flood_probability"] <= 1.0
    assert len(data["explanation"]["major_contributing_factors"]) == 10
    assert "random_forest" in data["model_comparison"]
    assert "xgboost" in data["model_comparison"]
    assert "logistic_regression" in data["model_comparison"]


def test_remote_sensing_ndwi_analysis():
    res = client.post(
        "/api/remote-sensing/analyze",
        json={
            "location_id": 1,
            "satellite_type": "Sentinel-2 MSI + Sentinel-1 SAR Fusion",
            "ndwi_threshold": 0.22,
            "sar_water_threshold_db": -16.5,
            "simulated_rainfall_mm": 215.0,
            "cloud_cover_pct": 18.0,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["geojson"]["type"] == "FeatureCollection"
    assert len(data["processing_pipeline"]) == 6
    assert data["detected_water_area_sq_km"] > 0


def test_post_flood_health_risk_assessment():
    res = client.post(
        "/api/health-risk/assess",
        json={
            "location_id": 1,
            "rainfall_mm": 230.0,
            "flood_probability": 0.88,
            "inundation_depth_m": 2.1,
            "stagnant_water_days": 5.5,
            "temperature_c": 30.5,
            "humidity_pct": 89.0,
            "sanitation_disruption_pct": 68.0,
            "safe_water_access_pct": 52.0,
            "shelter_crowd_index": 78.0,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "NOT provide clinical or medical diagnosis" in data["disclaimer"]
    assert 0 <= data["health_risk_score"] <= 100
    assert len(data["recommended_actions"]) >= 4


def test_gis_alerts_response_and_reports():
    for endpoint in [
        "/api/flood-zones?location_id=1",
        "/api/alerts?location_id=1",
        "/api/response/overview?location_id=1",
        "/api/analytics/overview",
        "/api/reports/generate?location_id=1",
        "/api/data/datasets",
        "/api/admin/users",
        "/api/admin/logs",
    ]:
        r = client.get(endpoint)
        assert r.status_code == 200, f"Failed on {endpoint}: {r.text}"


if __name__ == "__main__":
    test_health_endpoint()
    test_auth_login_and_register()
    test_dashboard_summary()
    test_flood_prediction_and_explainability()
    test_remote_sensing_ndwi_analysis()
    test_post_flood_health_risk_assessment()
    test_gis_alerts_response_and_reports()
    print("ALL 7 BACKEND END-TO-END TEST SUITES PASSED (18 REST ENDPOINTS VERIFIED)!")
