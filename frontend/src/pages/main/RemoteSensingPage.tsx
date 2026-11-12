import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { InteractiveFloodMap } from '../../components/map/InteractiveFloodMap';
import { Radio, Play, CheckCircle2, Layers } from 'lucide-react';

export const RemoteSensingPage: React.FC = () => {
  const { selectedLocationId, selectedLocation } = useAuth();
  const [params, setParams] = useState({
    satellite_type: 'Sentinel-2 MSI + Sentinel-1 SAR Fusion',
    ndwi_threshold: 0.22,
    sar_water_threshold_db: -16.5,
    simulated_rainfall_mm: 225.0,
    cloud_cover_pct: 14.5,
  });
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/remote-sensing/analyze', {
        location_id: selectedLocationId,
        ...params,
      });
      setAnalysis(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [selectedLocationId]);

  const loc = selectedLocation || {
    name: 'Cauvery Basin — Karur',
    latitude: 10.9601,
    longitude: 78.0766,
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-cyan-400" /> Satellite Remote Sensing &amp; NDWI / SAR Flood Extent Extraction
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Workflow: Satellite Data (Sentinel-1 SAR &amp; Sentinel-2 MSI) &rarr; Radiometric/Speckle Preprocessing &rarr; NDWI Water Detection &rarr; Flood Extent Extraction &rarr; GeoJSON &rarr; GIS Visualization
          </p>
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Play className="w-4 h-4" /> {loading ? 'Processing Raster...' : 'Run NDWI & SAR Extraction'}
        </button>
      </div>

      {/* Controls + Spectral KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5 text-xs">
          <h3 className="text-sm font-bold text-white">Sensor &amp; Threshold Parameters</h3>
          <div>
            <label className="block text-slate-300 mb-1">Satellite Constellation</label>
            <select
              value={params.satellite_type}
              onChange={(e) => setParams({ ...params, satellite_type: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
            >
              <option value="Sentinel-2 MSI + Sentinel-1 SAR Fusion">
                Sentinel-2 MSI + Sentinel-1 SAR Fusion
              </option>
              <option value="Sentinel-1 C-Band SAR (All-Weather VV/VH)">
                Sentinel-1 C-Band SAR (All-Weather VV/VH)
              </option>
              <option value="Sentinel-2 MSI Optical (Band 3 & Band 8 NDWI)">
                Sentinel-2 MSI Optical (Band 3 &amp; Band 8 NDWI)
              </option>
              <option value="NASA/USGS Landsat-9 OLI-2 MNDWI">
                NASA/USGS Landsat-9 OLI-2 MNDWI
              </option>
            </select>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>NDWI Water Threshold [(B03-B08)/(B03+B08)]</span>
              <span className="font-bold text-cyan-300">{params.ndwi_threshold}</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.01}
              value={params.ndwi_threshold}
              onChange={(e) =>
                setParams({ ...params, ndwi_threshold: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>Sentinel-1 SAR VV Backscatter Cutoff (dB)</span>
              <span className="font-bold text-cyan-300">{params.sar_water_threshold_db} dB</span>
            </div>
            <input
              type="range"
              min={-22.0}
              max={-12.0}
              step={0.5}
              value={params.sar_water_threshold_db}
              onChange={(e) =>
                setParams({ ...params, sar_water_threshold_db: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>Basin Storm Rainfall Forcing (mm)</span>
              <span className="font-bold text-cyan-300">{params.simulated_rainfall_mm} mm</span>
            </div>
            <input
              type="range"
              min={40}
              max={400}
              step={10}
              value={params.simulated_rainfall_mm}
              onChange={(e) =>
                setParams({ ...params, simulated_rainfall_mm: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-500"
            />
          </div>

          {/* 6-Stage Remote Sensing Pipeline Steps */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <p className="font-bold text-slate-200">Executed 6-Stage Processing Workflow:</p>
            {(analysis?.processing_pipeline || []).map((st: any) => (
              <div
                key={st.step}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-300">
                    {st.step}. {st.stage}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400">{st.details}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Extracted Flood Extent Metrics & Map */}
        <div className="lg:col-span-8 space-y-4">
          {analysis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <p className="text-slate-400">Detected Surface Water</p>
                <p className="text-xl font-extrabold text-cyan-300 mt-1">
                  {analysis.detected_water_area_sq_km} sq.km
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <p className="text-slate-400">Active Flood Anomaly</p>
                <p className="text-xl font-extrabold text-red-400 mt-1">
                  +{analysis.flood_anomaly_sq_km} sq.km
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <p className="text-slate-400">Basin Inundation %</p>
                <p className="text-xl font-extrabold text-amber-300 mt-1">
                  {analysis.inundation_pct}%
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <p className="text-slate-400">Mean NDWI / SAR VV</p>
                <p className="text-sm font-bold text-white mt-1.5">
                  {analysis.mean_ndwi} / {analysis.sar_backscatter_db} dB
                </p>
              </div>
            </div>
          )}

          <InteractiveFloodMap
            centerLat={loc.latitude}
            centerLng={loc.longitude}
            locationName={loc.name}
            remoteSensingFeatures={analysis?.geojson?.features || []}
            heightClass="h-[460px]"
            defaultShowRemoteSensing={true}
          />
        </div>
      </div>
    </div>
  );
};
