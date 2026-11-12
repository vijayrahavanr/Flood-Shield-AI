"""
FLOODSHIELD AI — SQLAlchemy ORM Database Models
Supports PostgreSQL in production and SQLite fallback for local development.
Entities:
  1. Role
  2. User
  3. Location
  4. WeatherObservation
  5. RiverObservation
  6. FloodPrediction
  7. FloodEvent
  8. FloodZone
  9. HealthRiskAssessment
  10. Alert
  11. Shelter
  12. Hospital
  13. EmergencyResource
  14. SatelliteObservation
  15. SystemLog
  16. AlertThreshold
"""
from datetime import datetime
from typing import Optional

try:
    from sqlalchemy import (
        Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON
    )
    from sqlalchemy.orm import declarative_base, relationship
    Base = declarative_base()
    HAS_SQLALCHEMY = True
except ImportError:
    HAS_SQLALCHEMY = False
    Base = object

if HAS_SQLALCHEMY:
    class Role(Base):
        __tablename__ = "roles"
        id = Column(Integer, primary_key=True, index=True)
        name = Column(String(64), unique=True, nullable=False, index=True)
        description = Column(String(255), nullable=False)
        permissions = Column(Text, nullable=False)  # JSON string of permissions
        created_at = Column(DateTime, default=datetime.utcnow)
        users = relationship("User", back_populates="role_rel")

    class User(Base):
        __tablename__ = "users"
        id = Column(Integer, primary_key=True, index=True)
        full_name = Column(String(120), nullable=False)
        email = Column(String(120), unique=True, nullable=False, index=True)
        password_hash = Column(String(255), nullable=False)
        role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
        role_name = Column(String(64), nullable=False, default="Viewer")
        organization = Column(String(120), default="National Disaster Management Authority")
        phone = Column(String(32), default="+91-9876543210")
        assigned_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
        is_active = Column(Boolean, default=True)
        created_at = Column(DateTime, default=datetime.utcnow)
        last_login = Column(DateTime, nullable=True)
        role_rel = relationship("Role", back_populates="users")
        assigned_location = relationship("Location", back_populates="assigned_users")

    class Location(Base):
        __tablename__ = "locations"
        id = Column(Integer, primary_key=True, index=True)
        name = Column(String(120), nullable=False, index=True)
        district = Column(String(120), nullable=False)
        state = Column(String(120), nullable=False)
        river_basin = Column(String(120), nullable=False)
        latitude = Column(Float, nullable=False)
        longitude = Column(Float, nullable=False)
        elevation_m = Column(Float, nullable=False)
        slope_deg = Column(Float, nullable=False)
        drainage_index = Column(Float, nullable=False)
        population = Column(Integer, nullable=False)
        area_sq_km = Column(Float, nullable=False)
        historical_flood_count = Column(Integer, default=2)
        danger_river_level_m = Column(Float, nullable=False)
        warning_river_level_m = Column(Float, nullable=False)
        created_at = Column(DateTime, default=datetime.utcnow)

        assigned_users = relationship("User", back_populates="assigned_location")
        weather_observations = relationship("WeatherObservation", back_populates="location")
        river_observations = relationship("RiverObservation", back_populates="location")
        flood_predictions = relationship("FloodPrediction", back_populates="location")
        flood_zones = relationship("FloodZone", back_populates="location")
        health_assessments = relationship("HealthRiskAssessment", back_populates="location")
        alerts = relationship("Alert", back_populates="location")
        shelters = relationship("Shelter", back_populates="location")
        hospitals = relationship("Hospital", back_populates="location")

    class WeatherObservation(Base):
        __tablename__ = "weather_observations"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
        rainfall_mm = Column(Float, nullable=False)
        rainfall_intensity_mm_hr = Column(Float, nullable=False)
        temperature_c = Column(Float, nullable=False)
        humidity_pct = Column(Float, nullable=False)
        wind_speed_kmh = Column(Float, nullable=False)
        soil_moisture_pct = Column(Float, nullable=False)
        pressure_hpa = Column(Float, default=1004.0)
        source = Column(String(64), default="IMD/OpenWeather-Telemetry")
        recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
        location = relationship("Location", back_populates="weather_observations")

    class RiverObservation(Base):
        __tablename__ = "river_observations"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
        station_name = Column(String(120), nullable=False)
        river_name = Column(String(120), nullable=False)
        water_level_m = Column(Float, nullable=False)
        warning_level_m = Column(Float, nullable=False)
        danger_level_m = Column(Float, nullable=False)
        discharge_cumecs = Column(Float, nullable=False)
        velocity_m_s = Column(Float, default=2.1)
        trend = Column(String(32), default="RISING")  # RISING, FALLING, STABLE
        recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
        location = relationship("Location", back_populates="river_observations")

    class FloodPrediction(Base):
        __tablename__ = "flood_predictions"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
        model_name = Column(String(64), nullable=False)
        flood_probability = Column(Float, nullable=False)
        risk_score = Column(Float, nullable=False)
        risk_category = Column(String(32), nullable=False)  # LOW, MODERATE, HIGH, SEVERE, CRITICAL
        estimated_affected_area_sq_km = Column(Float, nullable=False)
        estimated_population_at_risk = Column(Integer, nullable=False)
        input_features_json = Column(Text, nullable=False)
        explanation_json = Column(Text, nullable=False)
        created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
        predicted_at = Column(DateTime, default=datetime.utcnow, index=True)
        location = relationship("Location", back_populates="flood_predictions")

    class FloodEvent(Base):
        __tablename__ = "flood_events"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
        title = Column(String(160), nullable=False)
        severity = Column(String(32), nullable=False)
        peak_rainfall_mm = Column(Float, nullable=False)
        peak_river_level_m = Column(Float, nullable=False)
        inundated_area_sq_km = Column(Float, nullable=False)
        displaced_population = Column(Integer, nullable=False)
        start_date = Column(String(32), nullable=False)
        end_date = Column(String(32), nullable=True)
        status = Column(String(32), default="ACTIVE")
        notes = Column(Text, nullable=True)

    class FloodZone(Base):
        __tablename__ = "flood_zones"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
        zone_code = Column(String(32), unique=True, nullable=False)
        zone_name = Column(String(120), nullable=False)
        risk_category = Column(String(32), nullable=False)
        risk_score = Column(Float, nullable=False)
        flood_probability = Column(Float, nullable=False)
        inundation_depth_m = Column(Float, nullable=False)
        affected_area_sq_km = Column(Float, nullable=False)
        population_at_risk = Column(Integer, nullable=False)
        geojson_polygon = Column(Text, nullable=False)
        updated_at = Column(DateTime, default=datetime.utcnow)
        location = relationship("Location", back_populates="flood_zones")

    class HealthRiskAssessment(Base):
        __tablename__ = "health_risk_assessments"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
        zone_id = Column(Integer, ForeignKey("flood_zones.id"), nullable=True)
        health_risk_score = Column(Float, nullable=False)
        risk_category = Column(String(32), nullable=False)
        water_contamination_risk = Column(Float, nullable=False)
        diarrheal_disease_risk = Column(Float, nullable=False)
        mosquito_vector_risk = Column(Float, nullable=False)
        stagnant_water_risk = Column(Float, nullable=False)
        sanitation_risk = Column(Float, nullable=False)
        drinking_water_risk = Column(Float, nullable=False)
        heat_dehydration_risk = Column(Float, nullable=False)
        shelter_hygiene_risk = Column(Float, nullable=False)
        contributing_factors_json = Column(Text, nullable=False)
        recommended_actions_json = Column(Text, nullable=False)
        priority_areas_json = Column(Text, nullable=False)
        assessed_at = Column(DateTime, default=datetime.utcnow)
        location = relationship("Location", back_populates="health_assessments")

    class Alert(Base):
        __tablename__ = "alerts"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
        alert_type = Column(String(64), nullable=False)
        severity = Column(String(32), nullable=False)  # INFO, WARNING, HIGH, CRITICAL
        title = Column(String(200), nullable=False)
        message = Column(Text, nullable=False)
        recommended_action = Column(Text, nullable=False)
        trigger_metric = Column(String(120), nullable=True)
        is_active = Column(Boolean, default=True)
        acknowledged_by = Column(String(120), nullable=True)
        created_at = Column(DateTime, default=datetime.utcnow)
        location = relationship("Location", back_populates="alerts")

    class Shelter(Base):
        __tablename__ = "shelters"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
        name = Column(String(150), nullable=False)
        address = Column(String(255), nullable=False)
        latitude = Column(Float, nullable=False)
        longitude = Column(Float, nullable=False)
        capacity = Column(Integer, nullable=False)
        current_occupancy = Column(Integer, nullable=False)
        water_supply_status = Column(String(32), default="SAFE")
        sanitation_status = Column(String(32), default="ADEQUATE")
        power_backup = Column(Boolean, default=True)
        contact_person = Column(String(120), nullable=False)
        contact_phone = Column(String(32), nullable=False)
        status = Column(String(32), default="OPEN")
        location = relationship("Location", back_populates="shelters")

    class Hospital(Base):
        __tablename__ = "hospitals"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
        name = Column(String(150), nullable=False)
        facility_type = Column(String(64), nullable=False)
        latitude = Column(Float, nullable=False)
        longitude = Column(Float, nullable=False)
        total_beds = Column(Integer, nullable=False)
        available_beds = Column(Integer, nullable=False)
        icu_beds_available = Column(Integer, nullable=False)
        ambulances_available = Column(Integer, nullable=False)
        antivenom_ors_stock = Column(String(32), default="SUFFICIENT")
        flood_safe_access = Column(Boolean, default=True)
        emergency_phone = Column(String(32), nullable=False)
        location = relationship("Location", back_populates="hospitals")

    class EmergencyResource(Base):
        __tablename__ = "emergency_resources"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
        resource_type = Column(String(80), nullable=False)
        name = Column(String(120), nullable=False)
        total_quantity = Column(Integer, nullable=False)
        deployed_quantity = Column(Integer, nullable=False)
        available_quantity = Column(Integer, nullable=False)
        unit = Column(String(32), nullable=False)
        status = Column(String(32), default="READY")
        contact_team = Column(String(120), nullable=False)
        updated_at = Column(DateTime, default=datetime.utcnow)

    class SatelliteObservation(Base):
        __tablename__ = "satellite_observations"
        id = Column(Integer, primary_key=True, index=True)
        location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
        satellite_name = Column(String(64), nullable=False)  # Sentinel-1 SAR, Sentinel-2 MSI, NASA Landsat-9
        sensor_mode = Column(String(64), nullable=False)
        acquisition_time = Column(String(64), nullable=False)
        cloud_cover_pct = Column(Float, nullable=False)
        mean_ndwi = Column(Float, nullable=False)
        sar_backscatter_db = Column(Float, nullable=False)
        water_threshold = Column(Float, nullable=False)
        detected_water_area_sq_km = Column(Float, nullable=False)
        baseline_water_area_sq_km = Column(Float, nullable=False)
        flood_anomaly_sq_km = Column(Float, nullable=False)
        inundation_pct = Column(Float, nullable=False)
        geojson_extent = Column(Text, nullable=False)
        processing_pipeline = Column(Text, nullable=False)

    class SystemLog(Base):
        __tablename__ = "system_logs"
        id = Column(Integer, primary_key=True, index=True)
        level = Column(String(32), nullable=False)
        module = Column(String(64), nullable=False)
        action = Column(String(160), nullable=False)
        user_email = Column(String(120), default="system@floodshield.ai")
        details = Column(Text, nullable=True)
        created_at = Column(DateTime, default=datetime.utcnow)

    class AlertThreshold(Base):
        __tablename__ = "alert_thresholds"
        id = Column(Integer, primary_key=True, index=True)
        metric_key = Column(String(64), unique=True, nullable=False)
        metric_label = Column(String(120), nullable=False)
        unit = Column(String(32), nullable=False)
        warning_threshold = Column(Float, nullable=False)
        high_threshold = Column(Float, nullable=False)
        critical_threshold = Column(Float, nullable=False)
        alert_type = Column(String(64), nullable=False)
        updated_at = Column(DateTime, default=datetime.utcnow)
