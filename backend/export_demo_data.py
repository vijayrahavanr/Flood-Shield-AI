import json
from pathlib import Path
from app.db.database import init_and_seed_database, db_cursor, rows_to_dicts

init_and_seed_database()
data_dir = Path(__file__).resolve().parent.parent / "data"

with db_cursor() as cur:
    cur.execute("SELECT * FROM flood_zones")
    zones = rows_to_dicts(cur.fetchall())
    features = [json.loads(z["geojson_polygon"]) for z in zones]
    fc = {"type": "FeatureCollection", "name": "FloodShield_AI_Risk_Zones", "features": features}
    (data_dir / "geojson" / "flood_risk_zones.geojson").write_text(json.dumps(fc, indent=2))

    cur.execute("SELECT * FROM satellite_observations")
    sats = rows_to_dicts(cur.fetchall())
    (data_dir / "sample" / "sentinel_ndwi_scenes.json").write_text(json.dumps(sats, indent=2))

print("Exported standalone GeoJSON and Sentinel NDWI sample files.")
