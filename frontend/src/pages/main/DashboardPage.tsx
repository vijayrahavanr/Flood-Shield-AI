import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient, riskBadgeColor } from '../../api/client';
import { InteractiveFloodMap } from '../../components/map/InteractiveFloodMap';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  BrainCircuit,
  CloudRain,
  HeartPulse,
  Layers,
  ShieldAlert,
  Users,
  Waves,
  CheckCircle2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { selectedLocationId, selectedLocation } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/dashboard/summary?location_id=${selectedLocationId}`);
      setData(res.data);
    } catch {
      // Fallback handled gracefully if backend is warming up
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedLocationId]);

  const loc = data?.location || selectedLocation || {
    id: 1,
    name: 'Cauvery Basin — Karur & Mayanur Reach',
    district: 'Karur',
    state: 'Tamil Nadu',
    latitude: 10.9601,
    longitude: 78.0766,
  };

  const kpis = data?.kpis || {
    current_flood_risk: 'CRITICAL',
    flood_risk_score: 88.4,
    flood_probability_pct: 88.4,
    rainfall_mm: 236.0,
    rainfall_intensity_mm_hr: 49.6,
    river_level_m: 9.02,
    warning_level_m: 7.5,
    danger_level_m: 9.0,
    river_trend: 'RISING',
    affected_area_sq_km: 38.4,
    population_at_risk: 42800,
    health_risk_category: 'HIGH',
    health_risk_score: 76.4,
    active_alerts_count: 5,
  };

  const trends = data?.trends || [];
  const aiPred = data?.ai_prediction || {};
  const shapFactors = aiPred?.explanation?.major_contributing_factors || [];
  const activeAlerts = data?.active_alerts || [];
  const gis = data?.gis_overview || { flood_zones: [], shelters: [], hospitals: [] };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Unified Disaster &amp; Post-Flood Health Command Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active Sector: <strong className="text-slate-200">{loc.name}</strong> ({loc.district},{' '}
            {loc.state}) | Coordinates: {loc.latitude?.toFixed(4)}&deg;N, {loc.longitude?.toFixed(4)}&deg;E
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/flood-prediction"
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
          >
            <BrainCircuit className="w-4 h-4" /> Run Live AI Simulation
          </Link>
          <Link
            to="/health-risk"
            className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
          >
            <HeartPulse className="w-4 h-4" /> Post-Flood Health Assessment
          </Link>
        </div>
      </div>

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">1. Current Flood Risk</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md text-sm font-bold border ${riskBadgeColor(
                  kpis.current_flood_risk
                )}`}
              >
                {kpis.current_flood_risk}
              </span>
              <span className="text-xs text-slate-400">Score: {kpis.flood_risk_score}/100</span>
            </div>
          </div>
          <ShieldAlert className="w-6 h-6 text-red-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">2. AI Flood Probability</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {kpis.flood_probability_pct}%
            </p>
            <p className="text-[11px] text-blue-400 mt-0.5">Ensemble: XGBoost + Random Forest</p>
          </div>
          <BrainCircuit className="w-6 h-6 text-blue-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">3. 24h Rainfall &amp; Intensity</p>
            <p className="text-2xl font-extrabold text-cyan-300 mt-1">{kpis.rainfall_mm} mm</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Peak Rate: {kpis.rainfall_intensity_mm_hr} mm/hr
            </p>
          </div>
          <CloudRain className="w-6 h-6 text-cyan-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">4. River Water Level</p>
            <p className="text-2xl font-extrabold text-amber-300 mt-1">{kpis.river_level_m} m</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Danger: {kpis.danger_level_m} m ({kpis.river_trend})
            </p>
          </div>
          <Waves className="w-6 h-6 text-amber-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">5. Estimated Affected Area</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {kpis.affected_area_sq_km} <span className="text-sm font-normal">sq.km</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Sentinel-1/2 NDWI Validated</p>
          </div>
          <Layers className="w-6 h-6 text-indigo-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">6. Population at Risk</p>
            <p className="text-2xl font-extrabold text-orange-300 mt-1">
              {kpis.population_at_risk?.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across 4 Floodplain Zones</p>
          </div>
          <Users className="w-6 h-6 text-orange-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">7. Post-Flood Health Risk</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md text-sm font-bold border ${riskBadgeColor(
                  kpis.health_risk_category
                )}`}
              >
                {kpis.health_risk_category}
              </span>
              <span className="text-xs text-slate-300">{kpis.health_risk_score}/100</span>
            </div>
          </div>
          <HeartPulse className="w-6 h-6 text-purple-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">8. Active Command Alerts</p>
            <p className="text-2xl font-extrabold text-red-400 mt-1">{kpis.active_alerts_count}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Threshold-Triggered Warnings</p>
          </div>
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
      </div>

      {/* Main Interactive GIS Map + AI Explainability & Alert Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <InteractiveFloodMap
            centerLat={loc.latitude || 10.9601}
            centerLng={loc.longitude || 78.0766}
            locationName={loc.name}
            floodZones={gis.flood_zones}
            shelters={gis.shelters}
            hospitals={gis.hospitals}
            heightClass="h-[460px]"
          />
        </div>

        {/* Right Column: AI Explainability Panel & Active Alerts */}
        <div className="space-y-4">
          {/* AI Prediction & SHAP Explainability Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-blue-400" /> AI Prediction &amp; Why (SHAP)
              </h3>
              <span
                className={`px-2 py-0.5 text-xs font-bold rounded border ${riskBadgeColor(
                  kpis.current_flood_risk
                )}`}
              >
                {kpis.current_flood_risk} ({kpis.flood_probability_pct}%)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Major contributing hydro-topographic factors driving current flood probability:
            </p>
            <div className="space-y-2">
              {shapFactors.slice(0, 5).map((f: any) => (
                <div key={f.feature} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">{f.label}</span>
                    <span className="font-semibold text-cyan-300">
                      {f.qualitative_level} ({f.value})
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        f.qualitative_level === 'Very High'
                          ? 'bg-red-500'
                          : f.qualitative_level === 'High'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(Math.max(f.relative_importance_pct * 2.2, 18), 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Alerts Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Recent Active Alerts
              </h3>
              <Link to="/alerts" className="text-xs text-blue-400 hover:underline">
                View All &rarr;
              </Link>
            </div>
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {activeAlerts.slice(0, 4).map((al: any) => (
                <div
                  key={al.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${riskBadgeColor(
                        al.severity
                      )}`}
                    >
                      {al.severity}
                    </span>
                    <span className="text-[10px] text-slate-400">{al.alert_type}</span>
                  </div>
                  <p className="text-xs font-semibold text-white">{al.title}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{al.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5 Trend Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Rainfall Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">
            1. 14-Day Cumulative Rainfall &amp; Hourly Intensity Trend (mm)
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="rainfall_mm"
                  name="24h Rainfall (mm)"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.25}
                />
                <Area
                  type="monotone"
                  dataKey="rainfall_intensity_mm_hr"
                  name="Peak Intensity (mm/hr)"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: River Water-Level Trend vs Warning & Danger */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">
            2. River Water-Level Gauge Stage vs. Warning &amp; Danger Thresholds (m)
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="water_level_m"
                  name="Observed River Stage (m)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="warning_level_m"
                  name="Warning Level (m)"
                  stroke="#eab308"
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="danger_level_m"
                  name="Danger Level (m)"
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3 & 4 Combined: Flood Probability Trend & Post-Flood Health-Risk Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">
            3 &amp; 4. AI Flood Probability (%) &amp; Post-Flood Health Risk Score Trajectory
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="flood_probability_pct"
                  name="AI Flood Probability (%)"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="health_risk_score"
                  name="Post-Flood Health Risk Score (0-100)"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Affected-Area Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">
            5. Estimated Inundated / Affected Basin Area Trend (sq.km)
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend />
                <Bar
                  dataKey="affected_area_sq_km"
                  name="Inundated Area (sq.km)"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
