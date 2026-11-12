import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient, riskBadgeColor } from '../../api/client';
import { InteractiveFloodMap } from '../../components/map/InteractiveFloodMap';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { HeartPulse, ShieldCheck, AlertCircle, Play, CheckCircle2 } from 'lucide-react';

export const HealthRiskPage: React.FC = () => {
  const { selectedLocationId, selectedLocation } = useAuth();
  const [healthData, setHealthData] = useState<any>(null);
  const [simInputs, setSimInputs] = useState({
    rainfall_mm: 228.0,
    flood_probability: 0.86,
    inundation_depth_m: 1.85,
    stagnant_water_days: 5.0,
    temperature_c: 30.2,
    humidity_pct: 88.0,
    sanitation_disruption_pct: 64.0,
    safe_water_access_pct: 56.0,
    shelter_crowd_index: 74.0,
  });
  const [loading, setLoading] = useState(false);

  const runHealthAssessment = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/health-risk/assess', {
        location_id: selectedLocationId,
        ...simInputs,
      });
      setHealthData(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient
      .get(`/health-risk?location_id=${selectedLocationId}`)
      .then((res) => setHealthData(res.data))
      .catch(() => {});
  }, [selectedLocationId]);

  const loc = healthData?.location || selectedLocation || {
    name: 'Cauvery Basin — Karur',
    latitude: 10.9601,
    longitude: 78.0766,
  };

  const breakdownChart = healthData?.category_breakdown
    ? [
        { name: 'Water Contamination', score: healthData.category_breakdown.water_contamination },
        { name: 'Diarrheal Risk', score: healthData.category_breakdown.diarrheal_disease_risk },
        { name: 'Mosquito/Vector', score: healthData.category_breakdown.mosquito_vector_risk },
        { name: 'Stagnant Water', score: healthData.category_breakdown.stagnant_water_risk },
        { name: 'Sanitation Risk', score: healthData.category_breakdown.sanitation_risk },
        { name: 'Drinking Water', score: healthData.category_breakdown.drinking_water_risk },
        { name: 'Shelter Hygiene', score: healthData.category_breakdown.shelter_hygiene_risk },
        { name: 'Heat/Dehydration', score: healthData.category_breakdown.heat_dehydration_risk },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Decision-Support Non-Diagnostic Notice Banner */}
      <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-purple-300 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-200 space-y-1">
          <p className="font-bold uppercase tracking-wider">
            Public-Health Decision-Support &amp; Risk-Awareness Notice (Non-Diagnostic)
          </p>
          <p>
            {healthData?.disclaimer ||
              'DECISION-SUPPORT NOTICE: FloodShield AI Post-Flood Health Protection is an environmental epidemiology decision-support and public-health risk-awareness system. It evaluates environmental exposure conditions and does NOT provide clinical or medical diagnosis for individuals.'}
          </p>
        </div>
      </div>

      {/* Top Controls & Score Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Environmental Health Simulator Controls */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-purple-400" /> Post-Flood Environmental Inputs
            </h3>
            <button
              type="button"
              onClick={runHealthAssessment}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" /> Re-Assess
            </button>
          </div>

          {[
            { key: 'stagnant_water_days', label: 'Stagnant Water Duration (days)', min: 0, max: 21, step: 0.5 },
            { key: 'inundation_depth_m', label: 'Flood Inundation Depth (m)', min: 0, max: 5, step: 0.1 },
            { key: 'sanitation_disruption_pct', label: 'Sanitation Disruption (%)', min: 0, max: 100, step: 2 },
            { key: 'safe_water_access_pct', label: 'Safe Drinking Water Access (%)', min: 10, max: 100, step: 2 },
            { key: 'shelter_crowd_index', label: 'Shelter Occupancy Strain (%)', min: 10, max: 100, step: 2 },
            { key: 'humidity_pct', label: 'Post-Flood Humidity (%)', min: 40, max: 100, step: 1 },
          ].map((item) => (
            <div key={item.key} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">{item.label}</span>
                <span className="font-bold text-purple-300">{(simInputs as any)[item.key]}</span>
              </div>
              <input
                type="range"
                min={item.min}
                max={item.max}
                step={item.step}
                value={(simInputs as any)[item.key]}
                onChange={(e) =>
                  setSimInputs({ ...simInputs, [item.key]: parseFloat(e.target.value) })
                }
                className="w-full accent-purple-500"
              />
            </div>
          ))}
        </div>

        {/* Right: 8-Category Risk Breakdown, Contributing Factors & Recommended Actions */}
        <div className="lg:col-span-8 space-y-4">
          {healthData && (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    Composite Post-Flood Environmental Health Risk
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-3xl font-extrabold text-white">
                      {healthData.health_risk_score} / 100
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-bold border ${riskBadgeColor(
                        healthData.risk_category
                      )}`}
                    >
                      Health Risk: {healthData.risk_category}
                    </span>
                  </div>
                </div>
              </div>

              {/* 8 Risk Categories Bar Chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-white">
                  8 Environmental Health Risk Sub-Categories (0–100 Index)
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdownChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                      />
                      <Bar dataKey="score" name="Risk Index (0-100)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Contributing Factors & Recommended Public-Health Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <h4 className="text-sm font-bold text-white">Primary Contributing Factors</h4>
                  {(healthData.primary_contributing_factors || []).map((cf: any, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-purple-200">{cf.factor}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${riskBadgeColor(
                            cf.severity
                          )}`}
                        >
                          {cf.severity} ({cf.score})
                        </span>
                      </div>
                      <p className="text-slate-400">{cf.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Recommended Public-Health Actions
                  </h4>
                  {(healthData.recommended_actions || []).map((act: string, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-200">{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* GIS Post-Flood Health Risk Map */}
      <InteractiveFloodMap
        centerLat={loc.latitude}
        centerLng={loc.longitude}
        locationName={loc.name}
        healthPriorityAreas={healthData?.priority_areas || []}
        heightClass="h-[420px]"
        defaultShowHealth={true}
      />
    </div>
  );
};
