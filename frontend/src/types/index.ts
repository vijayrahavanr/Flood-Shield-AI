export type RiskCategory = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL';
export type AlertSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
export type UserRole =
  | 'Admin'
  | 'Disaster Management Officer'
  | 'Health Officer'
  | 'Analyst'
  | 'Viewer';

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  role_id: number;
  role_name: UserRole;
  organization: string;
  phone: string;
  assigned_location_id: number;
  is_active: boolean;
  permissions?: string[];
  last_login?: string;
}

export interface BasinLocation {
  id: number;
  name: string;
  district: string;
  state: string;
  river_basin: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  slope_deg: number;
  drainage_index: number;
  population: number;
  area_sq_km: number;
  historical_flood_count: number;
  danger_river_level_m: number;
  warning_river_level_m: number;
}

export interface ShapFactor {
  feature: string;
  label: string;
  value: number;
  qualitative_level: 'Very High' | 'High' | 'Moderate' | 'Low';
  shap_contribution: number;
  impact_pct: number;
  relative_importance_pct: number;
  direction: 'increases_risk' | 'mitigates_risk';
}

export interface FloodPredictionResult {
  prediction_id?: number;
  model_used: string;
  flood_probability: number;
  flood_probability_pct: number;
  risk_score: number;
  risk_category: RiskCategory;
  estimated_affected_area_sq_km: number;
  estimated_population_at_risk: number;
  model_comparison: {
    random_forest: number;
    xgboost: number;
    logistic_regression: number;
  };
  explanation: {
    method: string;
    summary: string;
    major_contributing_factors: ShapFactor[];
  };
}

export interface FloodZoneItem {
  id: number;
  location_id: number;
  zone_code: string;
  zone_name: string;
  risk_category: RiskCategory;
  risk_score: number;
  flood_probability: number;
  inundation_depth_m: number;
  affected_area_sq_km: number;
  population_at_risk: number;
  geojson?: any;
}

export interface ShelterItem {
  id: number;
  location_id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  water_supply_status: string;
  sanitation_status: string;
  power_backup: boolean;
  contact_person: string;
  contact_phone: string;
  status: string;
}

export interface HospitalItem {
  id: number;
  location_id: number;
  name: string;
  facility_type: string;
  latitude: number;
  longitude: number;
  total_beds: number;
  available_beds: number;
  icu_beds_available: number;
  ambulances_available: number;
  antivenom_ors_stock: string;
  flood_safe_access: boolean;
  emergency_phone: string;
}

export interface AlertItem {
  id: number;
  location_id: number;
  location_name?: string;
  district?: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  recommended_action: string;
  trigger_metric?: string;
  is_active: boolean;
  acknowledged_by?: string;
  created_at: string;
}

export interface HealthRiskResult {
  assessment_id?: number;
  location_id: number;
  location_name: string;
  disclaimer: string;
  health_risk_score: number;
  risk_category: RiskCategory;
  category_breakdown: {
    water_contamination: number;
    diarrheal_disease_risk: number;
    mosquito_vector_risk: number;
    stagnant_water_risk: number;
    sanitation_risk: number;
    drinking_water_risk: number;
    heat_dehydration_risk: number;
    shelter_hygiene_risk: number;
  };
  primary_contributing_factors: Array<{
    factor: string;
    severity: string;
    score: number;
    detail: string;
  }>;
  recommended_actions: string[];
  priority_areas: Array<{
    zone_name: string;
    risk_category: string;
    health_risk_score: number;
    primary_hazard: string;
    population_exposed: number;
    lat: number;
    lng: number;
  }>;
}
