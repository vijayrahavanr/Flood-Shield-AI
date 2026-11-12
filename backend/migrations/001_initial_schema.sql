-- ============================================================================
-- FLOODSHIELD AI - Database Migration 001: Complete Relational Schema
-- Compatible with PostgreSQL 14+ and SQLite 3.35+
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(64) UNIQUE NOT NULL,
    description VARCHAR(255) NOT NULL,
    permissions TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(120) NOT NULL,
    district VARCHAR(120) NOT NULL,
    state VARCHAR(120) NOT NULL,
    river_basin VARCHAR(120) NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    elevation_m REAL NOT NULL,
    slope_deg REAL NOT NULL,
    drainage_index REAL NOT NULL,
    population INTEGER NOT NULL,
    area_sq_km REAL NOT NULL,
    historical_flood_count INTEGER DEFAULT 2,
    danger_river_level_m REAL NOT NULL,
    warning_river_level_m REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    role_name VARCHAR(64) NOT NULL DEFAULT 'Viewer',
    organization VARCHAR(120) DEFAULT 'National Disaster Management Authority',
    phone VARCHAR(32) DEFAULT '+91-9876543210',
    assigned_location_id INTEGER REFERENCES locations(id),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weather_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    rainfall_mm REAL NOT NULL,
    rainfall_intensity_mm_hr REAL NOT NULL,
    temperature_c REAL NOT NULL,
    humidity_pct REAL NOT NULL,
    wind_speed_kmh REAL NOT NULL,
    soil_moisture_pct REAL NOT NULL,
    pressure_hpa REAL DEFAULT 1004.0,
    source VARCHAR(64) DEFAULT 'IMD/OpenWeather-Telemetry',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS river_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    station_name VARCHAR(120) NOT NULL,
    river_name VARCHAR(120) NOT NULL,
    water_level_m REAL NOT NULL,
    warning_level_m REAL NOT NULL,
    danger_level_m REAL NOT NULL,
    discharge_cumecs REAL NOT NULL,
    velocity_m_s REAL DEFAULT 2.1,
    trend VARCHAR(32) DEFAULT 'RISING',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flood_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    model_name VARCHAR(64) NOT NULL,
    flood_probability REAL NOT NULL,
    risk_score REAL NOT NULL,
    risk_category VARCHAR(32) NOT NULL,
    estimated_affected_area_sq_km REAL NOT NULL,
    estimated_population_at_risk INTEGER NOT NULL,
    input_features_json TEXT NOT NULL,
    explanation_json TEXT NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id),
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flood_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    title VARCHAR(160) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    peak_rainfall_mm REAL NOT NULL,
    peak_river_level_m REAL NOT NULL,
    inundated_area_sq_km REAL NOT NULL,
    displaced_population INTEGER NOT NULL,
    start_date VARCHAR(32) NOT NULL,
    end_date VARCHAR(32),
    status VARCHAR(32) DEFAULT 'ACTIVE',
    notes TEXT
);

CREATE TABLE IF NOT EXISTS flood_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    zone_code VARCHAR(32) UNIQUE NOT NULL,
    zone_name VARCHAR(120) NOT NULL,
    risk_category VARCHAR(32) NOT NULL,
    risk_score REAL NOT NULL,
    flood_probability REAL NOT NULL,
    inundation_depth_m REAL NOT NULL,
    affected_area_sq_km REAL NOT NULL,
    population_at_risk INTEGER NOT NULL,
    geojson_polygon TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_risk_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    zone_id INTEGER REFERENCES flood_zones(id),
    health_risk_score REAL NOT NULL,
    risk_category VARCHAR(32) NOT NULL,
    water_contamination_risk REAL NOT NULL,
    diarrheal_disease_risk REAL NOT NULL,
    mosquito_vector_risk REAL NOT NULL,
    stagnant_water_risk REAL NOT NULL,
    sanitation_risk REAL NOT NULL,
    drinking_water_risk REAL NOT NULL,
    heat_dehydration_risk REAL NOT NULL,
    shelter_hygiene_risk REAL NOT NULL,
    contributing_factors_json TEXT NOT NULL,
    recommended_actions_json TEXT NOT NULL,
    priority_areas_json TEXT NOT NULL,
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    alert_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    trigger_metric VARCHAR(120),
    is_active BOOLEAN DEFAULT 1,
    acknowledged_by VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shelters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    capacity INTEGER NOT NULL,
    current_occupancy INTEGER NOT NULL,
    water_supply_status VARCHAR(32) DEFAULT 'SAFE',
    sanitation_status VARCHAR(32) DEFAULT 'ADEQUATE',
    power_backup BOOLEAN DEFAULT 1,
    contact_person VARCHAR(120) NOT NULL,
    contact_phone VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS hospitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    name VARCHAR(150) NOT NULL,
    facility_type VARCHAR(64) NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    total_beds INTEGER NOT NULL,
    available_beds INTEGER NOT NULL,
    icu_beds_available INTEGER NOT NULL,
    ambulances_available INTEGER NOT NULL,
    antivenom_ors_stock VARCHAR(32) DEFAULT 'SUFFICIENT',
    flood_safe_access BOOLEAN DEFAULT 1,
    emergency_phone VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    resource_type VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    total_quantity INTEGER NOT NULL,
    deployed_quantity INTEGER NOT NULL,
    available_quantity INTEGER NOT NULL,
    unit VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'READY',
    contact_team VARCHAR(120) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS satellite_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    satellite_name VARCHAR(64) NOT NULL,
    sensor_mode VARCHAR(64) NOT NULL,
    acquisition_time VARCHAR(64) NOT NULL,
    cloud_cover_pct REAL NOT NULL,
    mean_ndwi REAL NOT NULL,
    sar_backscatter_db REAL NOT NULL,
    water_threshold REAL NOT NULL,
    detected_water_area_sq_km REAL NOT NULL,
    baseline_water_area_sq_km REAL NOT NULL,
    flood_anomaly_sq_km REAL NOT NULL,
    inundation_pct REAL NOT NULL,
    geojson_extent TEXT NOT NULL,
    processing_pipeline TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level VARCHAR(32) NOT NULL,
    module VARCHAR(64) NOT NULL,
    action VARCHAR(160) NOT NULL,
    user_email VARCHAR(120) DEFAULT 'system@floodshield.ai',
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_thresholds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_key VARCHAR(64) UNIQUE NOT NULL,
    metric_label VARCHAR(120) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    warning_threshold REAL NOT NULL,
    high_threshold REAL NOT NULL,
    critical_threshold REAL NOT NULL,
    alert_type VARCHAR(64) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
