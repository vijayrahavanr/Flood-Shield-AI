import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  CircleMarker,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { riskPolygonColor } from '../../api/client';
import { Layers, ShieldAlert, Home, Cross, Navigation, Radio } from 'lucide-react';

// Fix default Leaflet marker icons in Vite bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapRecenterProps {
  lat: number;
  lng: number;
}

const MapRecenter: React.FC<MapRecenterProps> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 12, { animate: true });
  }, [lat, lng, map]);
  return null;
};

interface InteractiveFloodMapProps {
  centerLat: number;
  centerLng: number;
  locationName: string;
  floodZones?: any[];
  remoteSensingFeatures?: any[];
  healthPriorityAreas?: any[];
  shelters?: any[];
  hospitals?: any[];
  evacuationPoints?: any[];
  evacuationRoutes?: any[];
  heightClass?: string;
  defaultShowHealth?: boolean;
  defaultShowRemoteSensing?: boolean;
}

export const InteractiveFloodMap: React.FC<InteractiveFloodMapProps> = ({
  centerLat,
  centerLng,
  locationName,
  floodZones = [],
  remoteSensingFeatures = [],
  healthPriorityAreas = [],
  shelters = [],
  hospitals = [],
  evacuationPoints = [],
  evacuationRoutes = [],
  heightClass = 'h-[480px]',
  defaultShowHealth = false,
  defaultShowRemoteSensing = false,
}) => {
  const [showFloodZones, setShowFloodZones] = useState(true);
  const [showRemoteSensing, setShowRemoteSensing] = useState(defaultShowRemoteSensing);
  const [showHealthZones, setShowHealthZones] = useState(defaultShowHealth);
  const [showShelters, setShowShelters] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Layer Toggle Toolbar */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            GIS Layer Controls — {locationName}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowFloodZones(!showFloodZones)}
            className={`px-2.5 py-1 rounded-md border transition flex items-center gap-1.5 ${
              showFloodZones
                ? 'bg-red-500/20 border-red-500/50 text-red-200'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Flood Risk Zones ({floodZones.length})
          </button>

          <button
            type="button"
            onClick={() => setShowRemoteSensing(!showRemoteSensing)}
            className={`px-2.5 py-1 rounded-md border transition flex items-center gap-1.5 ${
              showRemoteSensing
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Sentinel NDWI/SAR Water Extent
          </button>

          <button
            type="button"
            onClick={() => setShowHealthZones(!showHealthZones)}
            className={`px-2.5 py-1 rounded-md border transition flex items-center gap-1.5 ${
              showHealthZones
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Health-Risk Hotspots
          </button>

          <button
            type="button"
            onClick={() => setShowShelters(!showShelters)}
            className={`px-2.5 py-1 rounded-md border transition flex items-center gap-1.5 ${
              showShelters
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Shelters ({shelters.length})
          </button>

          <button
            type="button"
            onClick={() => setShowHospitals(!showHospitals)}
            className={`px-2.5 py-1 rounded-md border transition flex items-center gap-1.5 ${
              showHospitals
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-200'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Cross className="w-3.5 h-3.5" />
            Hospitals ({hospitals.length})
          </button>

          <button
            type="button"
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2.5 py-1 rounded-md border transition flex items-center gap-1.5 ${
              showRoutes
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Evacuation Corridors
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className={`relative w-full ${heightClass}`}>
        <MapContainer center={[centerLat, centerLng]} zoom={12} scrollWheelZoom={true}>
          <MapRecenter lat={centerLat} lng={centerLng} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Central Basin Gauge Marker */}
          <CircleMarker
            center={[centerLat, centerLng]}
            radius={9}
            pathOptions={{ color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>
              <div className="text-slate-900 text-xs space-y-1">
                <p className="font-bold text-sm">{locationName}</p>
                <p>Primary Hydrological & Telemetry Gauge Station</p>
                <p className="font-mono">
                  Lat: {centerLat.toFixed(4)}, Lng: {centerLng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </CircleMarker>

          {/* Flood Risk Zone Polygons */}
          {showFloodZones &&
            floodZones.map((zone) => {
              const coordsRaw =
                zone.geojson?.geometry?.coordinates?.[0] ||
                (zone.geojson_polygon ? JSON.parse(zone.geojson_polygon).geometry.coordinates[0] : []);
              const latLngs: [number, number][] = coordsRaw.map((pair: number[]) => [pair[1], pair[0]]);
              const color = riskPolygonColor(zone.risk_category);
              if (!latLngs.length) return null;
              return (
                <Polygon
                  key={zone.zone_code || zone.id}
                  positions={latLngs}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.35,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-slate-900 text-xs space-y-1">
                      <p className="font-bold text-sm">
                        {zone.zone_name} ({zone.zone_code})
                      </p>
                      <p>
                        Risk Category: <strong>{zone.risk_category}</strong> ({zone.risk_score}/100)
                      </p>
                      <p>Flood Probability: {Math.round(zone.flood_probability * 100)}%</p>
                      <p>Estimated Inundation Depth: {zone.inundation_depth_m} m</p>
                      <p>Affected Area: {zone.affected_area_sq_km} sq.km</p>
                      <p>Population at Risk: {zone.population_at_risk?.toLocaleString()}</p>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

          {/* Remote Sensing Flood Extent Polygons */}
          {showRemoteSensing &&
            remoteSensingFeatures.map((feat, idx) => {
              const ring = feat.geometry?.coordinates?.[0] || [];
              const latLngs: [number, number][] = ring.map((c: number[]) => [c[1], c[0]]);
              if (!latLngs.length) return null;
              return (
                <Polygon
                  key={feat.properties?.id || idx}
                  positions={latLngs}
                  pathOptions={{
                    color: '#06b6d4',
                    fillColor: '#0891b2',
                    fillOpacity: 0.45,
                    dashArray: '5, 5',
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-slate-900 text-xs space-y-1">
                      <p className="font-bold">{feat.properties?.name}</p>
                      <p>Sensor: {feat.properties?.sensor}</p>
                      <p>NDWI: {feat.properties?.ndwi_value} | SAR VV: {feat.properties?.sar_vv_db} dB</p>
                      <p>Inundation Area: {feat.properties?.area_sq_km} sq.km</p>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

          {/* Post-Flood Health Risk Hotspots */}
          {showHealthZones &&
            healthPriorityAreas.map((area, idx) => (
              <CircleMarker
                key={idx}
                center={[area.lat, area.lng]}
                radius={18}
                pathOptions={{
                  color: '#a855f7',
                  fillColor: '#9333ea',
                  fillOpacity: 0.42,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-slate-900 text-xs space-y-1">
                    <p className="font-bold text-purple-900">{area.zone_name}</p>
                    <p>
                      Health Risk: <strong>{area.risk_category}</strong> ({area.health_risk_score}/100)
                    </p>
                    <p>Primary Hazard: {area.primary_hazard}</p>
                    <p>Population Exposed: {area.population_exposed?.toLocaleString()}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Shelters */}
          {showShelters &&
            shelters.map((s) => (
              <CircleMarker
                key={`shelter-${s.id}`}
                center={[s.latitude, s.longitude]}
                radius={8}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#059669',
                  fillOpacity: 0.95,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-slate-900 text-xs space-y-1">
                    <p className="font-bold text-emerald-800">RELIEF SHELTER: {s.name}</p>
                    <p>{s.address}</p>
                    <p>
                      Occupancy: <strong>{s.current_occupancy}</strong> / {s.capacity}
                    </p>
                    <p>Water Supply: {s.water_supply_status}</p>
                    <p>Sanitation: {s.sanitation_status}</p>
                    <p>Contact: {s.contact_person} ({s.contact_phone})</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Hospitals */}
          {showHospitals &&
            hospitals.map((h) => (
              <CircleMarker
                key={`hosp-${h.id}`}
                center={[h.latitude, h.longitude]}
                radius={8}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#2563eb',
                  fillOpacity: 0.95,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-slate-900 text-xs space-y-1">
                    <p className="font-bold text-blue-800">HOSPITAL: {h.name}</p>
                    <p>Type: {h.facility_type}</p>
                    <p>
                      Available Beds: <strong>{h.available_beds}</strong> / {h.total_beds} (ICU: {h.icu_beds_available})
                    </p>
                    <p>Ambulances Ready: {h.ambulances_available}</p>
                    <p>Emergency Phone: {h.emergency_phone}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Evacuation Points */}
          {showRoutes &&
            evacuationPoints.map((pt) => (
              <Marker key={`evac-pt-${pt.id}`} position={[pt.lat, pt.lng]}>
                <Popup>
                  <div className="text-slate-900 text-xs space-y-1">
                    <p className="font-bold text-amber-800">EVACUATION POINT: {pt.name}</p>
                    <p>Safe Elevation: {pt.safe_elevation_m} m MSL</p>
                    <p>Route Status: {pt.route_status}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Safe Evacuation Corridors */}
          {showRoutes &&
            evacuationRoutes.map((rt) => (
              <Polyline
                key={rt.id}
                positions={rt.coordinates}
                pathOptions={{ color: '#f59e0b', weight: 4, dashArray: '8, 6' }}
              >
                <Popup>
                  <div className="text-slate-900 text-xs space-y-1">
                    <p className="font-bold">{rt.name}</p>
                    <p>
                      Distance: {rt.distance_km} km | Est. Transit: {rt.estimated_time_min} min
                    </p>
                    <p>Status: {rt.status}</p>
                  </div>
                </Popup>
              </Polyline>
            ))}
        </MapContainer>
      </div>

      {/* Legend Footer */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-300">Severity Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Critical (&ge;85)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" /> Severe (70–84)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> High (50–69)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-yellow-500 inline-block" /> Moderate (30–49)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Low (&lt;30)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Relief Shelter
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Hospital
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Health Risk Zone
          </span>
        </div>
      </div>
    </div>
  );
};
