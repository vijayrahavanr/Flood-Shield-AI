import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient, riskBadgeColor } from '../../api/client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { BrainCircuit, Play, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';

export const FloodPredictionPage: React.FC = () => {
  const { selectedLocationId, selectedLocation } = useAuth();
  const [modelChoice, setModelChoice] = useState<'xgboost' | 'random_forest' | 'logistic_regression'>('xgboost');
  const [inputs, setInputs] = useState({
    rainfall: 228.0,
    rainfall_intensity: 46.5,
    temperature: 28.2,
    humidity: 89.0,
    river_level: 8.95,
    soil_moisture: 86.0,
    elevation: 38.0,
    slope: 1.8,
    drainage_index: 42.0,
    historical_flood_count: 5,
  });
  const [prediction, setPrediction] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runPrediction = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/flood/predict', {
        location_id: selectedLocationId,
        model_choice: modelChoice,
        ...inputs,
      });
      setPrediction(res.data);
      const histRes = await apiClient.get(`/flood/history?location_id=${selectedLocationId}`);
      setHistory(histRes.data.predictions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLocation) {
      setInputs((prev) => ({
        ...prev,
        elevation: selectedLocation.elevation_m,
        slope: selectedLocation.slope_deg,
        drainage_index: selectedLocation.drainage_index,
        historical_flood_count: selectedLocation.historical_flood_count,
        river_level: Number((selectedLocation.warning_river_level_m + 1.1).toFixed(2)),
      }));
    }
  }, [selectedLocationId]);

  useEffect(() => {
    runPrediction();
  }, [selectedLocationId, modelChoice]);

  const factors = prediction?.explanation?.major_contributing_factors || [];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-blue-400" /> AI / ML Flood Prediction &amp; SHAP Explainability Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare XGBoost, Random Forest, and Logistic Regression models across 10 hydro-meteorological &amp; topographic features.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['xgboost', 'random_forest', 'logistic_regression'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModelChoice(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                modelChoice === m
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {m === 'xgboost'
                ? 'XGBoost (Primary)'
                : m === 'random_forest'
                ? 'Random Forest'
                : 'Logistic Regression'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 10-Feature Input Parameter Controls */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Hydro-Meteorological &amp; Terrain Inputs</h3>
            <button
              type="button"
              onClick={runPrediction}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> {loading ? 'Computing...' : 'Execute AI Inference'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {[
              { key: 'rainfall', label: '24h Rainfall (mm)', min: 0, max: 450, step: 5 },
              { key: 'rainfall_intensity', label: 'Rainfall Intensity (mm/hr)', min: 0, max: 100, step: 1 },
              { key: 'river_level', label: 'River Water Level (m)', min: 1, max: 16, step: 0.1 },
              { key: 'soil_moisture', label: 'Soil Moisture (%)', min: 10, max: 100, step: 1 },
              { key: 'humidity', label: 'Relative Humidity (%)', min: 25, max: 100, step: 1 },
              { key: 'temperature', label: 'Temperature (°C)', min: 15, max: 45, step: 0.5 },
              { key: 'elevation', label: 'Terrain Elevation (m)', min: 1, max: 300, step: 1 },
              { key: 'slope', label: 'Topographic Slope (°)', min: 0.1, max: 20, step: 0.2 },
              { key: 'drainage_index', label: 'Drainage Capacity (0-100)', min: 10, max: 95, step: 1 },
              { key: 'historical_flood_count', label: 'Historical Floods (10yr)', min: 0, max: 15, step: 1 },
            ].map((item) => (
              <div key={item.key} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>{item.label}</span>
                  <span className="text-blue-400 font-bold">{(inputs as any)[item.key]}</span>
                </div>
                <input
                  type="range"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={(inputs as any)[item.key]}
                  onChange={(e) =>
                    setInputs({ ...inputs, [item.key]: parseFloat(e.target.value) })
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: AI Output, Model Comparison & SHAP Feature Explainability */}
        <div className="lg:col-span-7 space-y-5">
          {prediction && (
            <>
              {/* Prediction Result Hero Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      AI Prediction Outcome ({prediction.model_used.toUpperCase()})
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-3xl font-extrabold text-white">
                        {prediction.flood_probability_pct}%
                      </span>
                      <span
                        className={`px-3 py-1 rounded-lg text-sm font-bold border ${riskBadgeColor(
                          prediction.risk_category
                        )}`}
                      >
                        Flood Risk: {prediction.risk_category}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div>
                      <p className="text-slate-400">Est. Inundated Area</p>
                      <p className="text-base font-bold text-cyan-300">
                        {prediction.estimated_affected_area_sq_km} sq.km
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Population at Risk</p>
                      <p className="text-base font-bold text-orange-300">
                        {prediction.estimated_population_at_risk?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Multi-Model Probability Comparison */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <p className="text-slate-400">XGBoost Boosting</p>
                    <p className="text-lg font-bold text-blue-400">
                      {(prediction.model_comparison.xgboost * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <p className="text-slate-400">Random Forest</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {(prediction.model_comparison.random_forest * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <p className="text-slate-400">Logistic Baseline</p>
                    <p className="text-lg font-bold text-amber-400">
                      {(prediction.model_comparison.logistic_regression * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Explainability: Why this prediction? */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> AI Model Explainability — Major Contributing Factors
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {prediction.explanation?.summary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Qualitative Factor Breakdown */}
                  <div className="space-y-2 text-xs">
                    {factors.slice(0, 6).map((f: any) => (
                      <div
                        key={f.feature}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{f.label}</p>
                          <p className="text-[11px] text-slate-400">
                            Observed Value: <strong>{f.value}</strong>
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              f.qualitative_level === 'Very High'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : f.qualitative_level === 'High'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            }`}
                          >
                            {f.qualitative_level}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Weight: {f.relative_importance_pct}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bar Chart of Relative Feature Importance */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={factors.slice(0, 6)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                        <YAxis
                          type="category"
                          dataKey="feature"
                          stroke="#94a3b8"
                          fontSize={11}
                          width={110}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                        />
                        <Bar dataKey="relative_importance_pct" name="Contribution (%)">
                          {factors.slice(0, 6).map((entry: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.qualitative_level === 'Very High'
                                  ? '#ef4444'
                                  : entry.qualitative_level === 'High'
                                  ? '#f59e0b'
                                  : '#3b82f6'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
