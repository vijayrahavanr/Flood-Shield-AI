import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient, riskBadgeColor } from '../../api/client';
import { InteractiveFloodMap } from '../../components/map/InteractiveFloodMap';
import { Map, Navigation, Home, Cross } from 'lucide-react';

export const FloodMapPage: React.FC = () => {
  const { selectedLocationId, selectedLocation } = useAuth();
  const [gisData, setGisData] = useState<any>(null);

  useEffect(() => {
    apiClient
      .get(`/flood-zones?location_id=${selectedLocationId}`)
      .then((res) => setGisData(res.data))
      .catch(() => {});
  }, [selectedLocationId]);

  const loc = gisData?.location || selectedLocation || {
    name: 'Cauvery Basin — Karur',
    latitude: 10.9601,
    longitude: 78.0766,
  };
  const zones = gisData?.flood_zones || [];
  const rsFeatures = gisData?.remote_sensing_extent?.features || [];
  const shelters = gisData?.shelters || [];
  const hospitals = gisData?.hospitals || [];
  const evacPoints = gisData?.evacuation_points || [];
  const evacRoutes = gisData?.evacuation_routes || [];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Map className="w-6 h-6 text-blue-400" /> Interactive GIS Flood-Risk &amp; Evacuation Command Map
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-layer OpenStreetMap + GeoJSON visualization of Flood Risk Zones, Sentinel-1/2 Flood Extent, Shelters, Hospitals, and Evacuation Corridors.
          </p>
        </div>
      </div>

      <InteractiveFloodMap
        centerLat={loc.latitude}
        centerLng={loc.longitude}
        locationName={loc.name}
        floodZones={zones}
        remoteSensingFeatures={rsFeatures}
        shelters={shelters}
        hospitals={hospitals}
        evacuationPoints={evacPoints}
        evacuationRoutes={evacRoutes}
        heightClass="h-[540px]"
        defaultShowRemoteSensing={true}
      />

      {/* Zone Severity Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">GeoJSON Flood Risk Zones Inventory</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase">
              <tr>
                <th className="p-2.5">Zone Code</th>
                <th className="p-2.5">Sector / Floodplain Name</th>
                <th className="p-2.5">Severity</th>
                <th className="p-2.5">Flood Prob.</th>
                <th className="p-2.5">Est. Depth</th>
                <th className="p-2.5">Affected Area</th>
                <th className="p-2.5">Population at Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {zones.map((z: any) => (
                <tr key={z.zone_code} className="hover:bg-slate-800/50">
                  <td className="p-2.5 font-mono font-bold text-blue-400">{z.zone_code}</td>
                  <td className="p-2.5 font-medium text-white">{z.zone_name}</td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border ${riskBadgeColor(
                        z.risk_category
                      )}`}
                    >
                      {z.risk_category} ({z.risk_score})
                    </span>
                  </td>
                  <td className="p-2.5">{Math.round(z.flood_probability * 100)}%</td>
                  <td className="p-2.5">{z.inundation_depth_m} m</td>
                  <td className="p-2.5">{z.affected_area_sq_km} sq.km</td>
                  <td className="p-2.5 font-semibold text-orange-300">
                    {z.population_at_risk?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
