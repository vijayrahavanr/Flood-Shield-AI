"""
FLOODSHIELD AI — Post-Flood Health Protection & Environmental Risk Decision-Support Engine
IMPORTANT DISCLAIMER:
This module is a public-health decision-support and environmental risk-awareness system,
NOT a clinical or medical diagnosis system. It never claims to diagnose diseases in individuals.
"""
from typing import Any, Dict, List, Optional
import numpy as np

MEDICAL_DISCLAIMER = (
    "DECISION-SUPPORT NOTICE: FloodShield AI Post-Flood Health Protection is an environmental "
    "epidemiology decision-support and public-health risk-awareness system. It evaluates environmental "
    "exposure conditions and does NOT provide clinical or medical diagnosis for individuals."
)


class PostFloodHealthRiskEngine:
    """Calculates environmental post-flood health risk scores, contributing factors, and action plans."""

    def assess_health_risk(
        self,
        location_id: int,
        location_name: str,
        rainfall_mm: float,
        flood_probability: float,
        inundation_depth_m: float,
        stagnant_water_days: float = 4.0,
        temperature_c: float = 30.5,
        humidity_pct: float = 84.0,
        sanitation_disruption_pct: float = 58.0,
        safe_water_access_pct: float = 62.0,
        shelter_crowd_index: float = 72.0,
        drainage_index: float = 42.0,
        center_lat: float = 10.9601,
        center_lng: float = 78.0766,
    ) -> Dict[str, Any]:
        # Compute 8 specific environmental risk sub-scores (0 - 100 scale)
        stagnant_water_risk = float(np.clip(
            25.0 + inundation_depth_m * 18.0 + stagnant_water_days * 6.8 + (100.0 - drainage_index) * 0.32,
            5.0, 99.0
        ))
        water_contamination_risk = float(np.clip(
            20.0 + rainfall_mm * 0.14 + inundation_depth_m * 16.0 + sanitation_disruption_pct * 0.45,
            5.0, 99.0
        ))
        drinking_water_risk = float(np.clip(
            (100.0 - safe_water_access_pct) * 0.65 + water_contamination_risk * 0.35,
            5.0, 99.0
        ))
        sanitation_risk = float(np.clip(
            sanitation_disruption_pct * 0.68 + inundation_depth_m * 12.5 + flood_probability * 20.0,
            5.0, 99.0
        ))
        diarrheal_disease_risk = float(np.clip(
            0.42 * water_contamination_risk + 0.35 * drinking_water_risk + 0.23 * sanitation_risk,
            5.0, 99.0
        ))
        mosquito_vector_risk = float(np.clip(
            0.48 * stagnant_water_risk + 0.28 * humidity_pct + 0.8 * max(temperature_c - 22.0, 0.0),
            5.0, 99.0
        ))
        heat_dehydration_risk = float(np.clip(
            max(temperature_c - 24.0, 0.0) * 4.2 + humidity_pct * 0.28 + (100.0 - safe_water_access_pct) * 0.25,
            5.0, 99.0
        ))
        shelter_hygiene_risk = float(np.clip(
            shelter_crowd_index * 0.55 + sanitation_risk * 0.30 + drinking_water_risk * 0.15,
            5.0, 99.0
        ))

        sub_scores = {
            "water_contamination": round(water_contamination_risk, 1),
            "diarrheal_disease_risk": round(diarrheal_disease_risk, 1),
            "mosquito_vector_risk": round(mosquito_vector_risk, 1),
            "stagnant_water_risk": round(stagnant_water_risk, 1),
            "sanitation_risk": round(sanitation_risk, 1),
            "drinking_water_risk": round(drinking_water_risk, 1),
            "heat_dehydration_risk": round(heat_dehydration_risk, 1),
            "shelter_hygiene_risk": round(shelter_hygiene_risk, 1),
        }

        weights = {
            "water_contamination": 0.18,
            "diarrheal_disease_risk": 0.15,
            "mosquito_vector_risk": 0.15,
            "stagnant_water_risk": 0.14,
            "sanitation_risk": 0.14,
            "drinking_water_risk": 0.10,
            "shelter_hygiene_risk": 0.08,
            "heat_dehydration_risk": 0.06,
        }
        overall_score = round(sum(sub_scores[k] * weights[k] for k in sub_scores), 1)

        if overall_score >= 82.0:
            category = "CRITICAL"
        elif overall_score >= 68.0:
            category = "SEVERE"
        elif overall_score >= 52.0:
            category = "HIGH"
        elif overall_score >= 35.0:
            category = "MODERATE"
        else:
            category = "LOW"

        contributing_factors = []
        if stagnant_water_risk >= 55:
            contributing_factors.append({
                "factor": "Stagnant floodwater persistence",
                "severity": "HIGH" if stagnant_water_risk < 78 else "CRITICAL",
                "score": round(stagnant_water_risk, 1),
                "detail": f"Estimated {stagnant_water_days} days of standing water across poorly drained basins.",
            })
        if water_contamination_risk >= 50:
            contributing_factors.append({
                "factor": "Surface & groundwater cross-contamination possibility",
                "severity": "HIGH" if water_contamination_risk < 78 else "CRITICAL",
                "score": round(water_contamination_risk, 1),
                "detail": f"Heavy runoff ({rainfall_mm} mm) and flood depth ({inundation_depth_m} m) elevate turbidity and pathogen transport risk.",
            })
        if sanitation_risk >= 50:
            contributing_factors.append({
                "factor": "Sanitation & sewage network disruption",
                "severity": "HIGH" if sanitation_risk < 75 else "CRITICAL",
                "score": round(sanitation_risk, 1),
                "detail": f"{sanitation_disruption_pct}% estimated drainage/latrine overflow exposure in low-lying wards.",
            })
        if mosquito_vector_risk >= 55:
            contributing_factors.append({
                "factor": "Vector/mosquito breeding habitat expansion",
                "severity": "HIGH",
                "score": round(mosquito_vector_risk, 1),
                "detail": f"Warm humid post-flood microclimate ({temperature_c}°C, {humidity_pct}% RH) accelerates vector larval cycles.",
            })
        if shelter_hygiene_risk >= 50:
            contributing_factors.append({
                "factor": "Relief shelter crowding & hygiene strain",
                "severity": "MODERATE" if shelter_hygiene_risk < 70 else "HIGH",
                "score": round(shelter_hygiene_risk, 1),
                "detail": f"Shelter occupancy pressure index at {shelter_crowd_index}%.",
            })

        if not contributing_factors:
            contributing_factors.append({
                "factor": "Baseline post-rainfall environmental moisture",
                "severity": "LOW",
                "score": overall_score,
                "detail": "Routine post-monsoon water quality and vector surveillance advised.",
            })

        recommended_actions = [
            "Inspect and chlorinate municipal & borewell drinking-water sources; test residual chlorine levels every 6 hours.",
            "Deploy mobile water purification tankers and distribute halogen/chlorine tablets and ORS packets to flood-affected wards.",
            "Pump out stagnant water pockets and apply biological larvicides (Bti) + targeted fogging for vector control.",
            "Increase sanitation monitoring and deploy mobile bio-toilets and lime/bleaching powder disinfection around relief camps.",
            "Conduct hygiene awareness drives at evacuation shelters and establish fever/hydration screening desks.",
        ]

        priority_areas = [
            {
                "zone_name": f"{location_name} — Riverbank Low-Lying Ward A",
                "risk_category": category,
                "health_risk_score": min(round(overall_score + 7.5, 1), 99.0),
                "primary_hazard": "Drinking-Water Contamination & Sanitation Overflow",
                "population_exposed": 28400,
                "lat": round(center_lat + 0.008, 5),
                "lng": round(center_lng - 0.011, 5),
            },
            {
                "zone_name": f"{location_name} — Northern Canal Stagnation Belt",
                "risk_category": "HIGH" if overall_score >= 45 else "MODERATE",
                "health_risk_score": round(mosquito_vector_risk, 1),
                "primary_hazard": "Stagnant Water & Mosquito Vector Proliferation",
                "population_exposed": 19200,
                "lat": round(center_lat + 0.022, 5),
                "lng": round(center_lng + 0.009, 5),
            },
            {
                "zone_name": f"{location_name} — Southern Relief Shelter Cluster",
                "risk_category": "HIGH" if shelter_hygiene_risk >= 60 else "MODERATE",
                "health_risk_score": round(shelter_hygiene_risk, 1),
                "primary_hazard": "Shelter Crowding, WASH & Hydration Demand",
                "population_exposed": 11500,
                "lat": round(center_lat - 0.015, 5),
                "lng": round(center_lng + 0.014, 5),
            },
        ]

        return {
            "location_id": location_id,
            "location_name": location_name,
            "disclaimer": MEDICAL_DISCLAIMER,
            "health_risk_score": overall_score,
            "risk_category": category,
            "category_breakdown": sub_scores,
            "primary_contributing_factors": contributing_factors,
            "recommended_actions": recommended_actions,
            "priority_areas": priority_areas,
        }


health_risk_engine = PostFloodHealthRiskEngine()
