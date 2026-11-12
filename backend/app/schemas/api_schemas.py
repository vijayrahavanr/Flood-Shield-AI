"""
FLOODSHIELD AI — Pydantic Request & Response Schemas
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(..., example="admin@floodshield.ai")
    password: str = Field(..., example="Password123!")


class RegisterRequest(BaseModel):
    full_name: str = Field(..., example="Ananya Narayanan")
    email: str = Field(..., example="ananya@floodshield.ai")
    password: str = Field(..., min_length=6, example="Password123!")
    role_name: str = Field(default="Analyst", example="Analyst")
    organization: str = Field(default="State Disaster Management Authority")
    phone: str = Field(default="+91-9876543210")
    assigned_location_id: Optional[int] = Field(default=1)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., example="analyst@floodshield.ai")


class FloodPredictRequest(BaseModel):
    location_id: int = Field(default=1)
    model_choice: str = Field(default="xgboost", description="xgboost, random_forest, or logistic_regression")
    rainfall: float = Field(..., ge=0, le=600, example=218.0)
    rainfall_intensity: float = Field(..., ge=0, le=180, example=44.5)
    temperature: float = Field(default=28.5, ge=-10, le=55)
    humidity: float = Field(default=88.0, ge=0, le=100)
    river_level: float = Field(..., ge=0, le=30, example=8.85)
    soil_moisture: float = Field(default=84.0, ge=0, le=100)
    elevation: float = Field(default=38.0, ge=0, le=3000)
    slope: float = Field(default=1.8, ge=0, le=60)
    drainage_index: float = Field(default=42.0, ge=0, le=100)
    historical_flood_count: int = Field(default=5, ge=0, le=30)


class RemoteSensingAnalyzeRequest(BaseModel):
    location_id: int = Field(default=1)
    satellite_type: str = Field(default="Sentinel-2 MSI + Sentinel-1 SAR Fusion")
    ndwi_threshold: float = Field(default=0.22, ge=-0.5, le=0.8)
    sar_water_threshold_db: float = Field(default=-16.5, ge=-30.0, le=-5.0)
    simulated_rainfall_mm: float = Field(default=220.0, ge=0.0, le=600.0)
    cloud_cover_pct: float = Field(default=16.5, ge=0.0, le=100.0)
    green_band_matrix: Optional[List[List[float]]] = None
    nir_band_matrix: Optional[List[List[float]]] = None
    sar_vv_db_matrix: Optional[List[List[float]]] = None


class HealthRiskAssessRequest(BaseModel):
    location_id: int = Field(default=1)
    rainfall_mm: float = Field(default=225.0, ge=0, le=600)
    flood_probability: float = Field(default=0.86, ge=0.0, le=1.0)
    inundation_depth_m: float = Field(default=1.85, ge=0.0, le=12.0)
    stagnant_water_days: float = Field(default=5.0, ge=0.0, le=60.0)
    temperature_c: float = Field(default=30.2, ge=10.0, le=50.0)
    humidity_pct: float = Field(default=87.0, ge=20.0, le=100.0)
    sanitation_disruption_pct: float = Field(default=64.0, ge=0.0, le=100.0)
    safe_water_access_pct: float = Field(default=56.0, ge=0.0, le=100.0)
    shelter_crowd_index: float = Field(default=74.0, ge=0.0, le=100.0)


class AlertCreateRequest(BaseModel):
    location_id: int = Field(default=1)
    alert_type: str = Field(..., example="Flood Alert")
    severity: str = Field(..., example="CRITICAL")
    title: str = Field(..., example="CRITICAL EMBANKMENT SEEPAGE ALERT")
    message: str = Field(..., example="Observed embankment seepage at Mayanur barrage reach.")
    recommended_action: str = Field(..., example="Deploy sandbag reinforcement crews and evacuate 500m buffer.")
    trigger_metric: Optional[str] = Field(default="Manual Command Dispatch")


class ThresholdUpdateRequest(BaseModel):
    warning_threshold: float
    high_threshold: float
    critical_threshold: float


class ShelterUpdateRequest(BaseModel):
    current_occupancy: int
    water_supply_status: str
    sanitation_status: str
    status: str


class ResourceUpdateRequest(BaseModel):
    deployed_quantity: int
    available_quantity: int
    status: str


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role_name: Optional[str] = None
    organization: Optional[str] = None
    phone: Optional[str] = None
    assigned_location_id: Optional[int] = None
    is_active: Optional[bool] = None


class LocationCreateRequest(BaseModel):
    name: str
    district: str
    state: str
    river_basin: str
    latitude: float
    longitude: float
    elevation_m: float = 35.0
    slope_deg: float = 2.0
    drainage_index: float = 48.0
    population: int = 200000
    area_sq_km: float = 110.0
    historical_flood_count: int = 4
    danger_river_level_m: float = 8.5
    warning_river_level_m: float = 7.2
