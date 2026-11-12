import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart3, Award } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    apiClient
      .get('/analytics/overview')
      .then((res) => setAnalytics(res.data))
      .catch(() => {});
  }, []);

  const basins = analytics?.basin_comparison || [];
  const models = analytics?.ml_benchmarks?.models || {};
  const globalImp = analytics?.ml_benchmarks?.global_feature_importance || [];
  const seasonal = analytics?.seasonal_profile || [];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" /> Multi-Basin Climate, ML Benchmark &amp; Epidemiological Analytics
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Cross-basin comparison of flood probability, inundated area, post-flood health risk, and machine-learning validation metrics.
        </p>
      </div>

      {/* ML Model Performance Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" /> Trained ML Model Evaluation Metrics (Test Split Validation)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase">
              <tr>
                <th className="p-2.5">Model Architecture</th>
                <th className="p-2.5">Accuracy</th>
                <th className="p-2.5">Precision</th>
                <th className="p-2.5">Recall</th>
                <th className="p-2.5">F1-Score</th>
                <th className="p-2.5">ROC-AUC</th>
                <th className="p-2.5">Brier Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {Object.values(models).map((m: any) => (
                <tr key={m.code}>
                  <td className="p-2.5 font-bold text-white">{m.name}</td>
                  <td className="p-2.5 text-emerald-300 font-semibold">
                    {(m.metrics.accuracy * 100).toFixed(2)}%
                  </td>
                  <td className="p-2.5">{(m.metrics.precision * 100).toFixed(2)}%</td>
                  <td className="p-2.5">{(m.metrics.recall * 100).toFixed(2)}%</td>
                  <td className="p-2.5 font-semibold text-blue-300">
                    {(m.metrics.f1_score * 100).toFixed(2)}%
                  </td>
                  <td className="p-2.5 font-bold text-cyan-300">{m.metrics.roc_auc}</td>
                  <td className="p-2.5 text-slate-300">{m.metrics.brier_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Multi-Basin Flood Probability (%) vs. Post-Flood Health Risk Score
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={basins}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="district" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend />
                <Bar dataKey="flood_probability_pct" name="Flood Probability (%)" fill="#ef4444" />
                <Bar dataKey="health_risk_score" name="Health Risk Score" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Seasonal Monsoon Rainfall (mm) &amp; Environmental Health Risk Profile
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seasonal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_rainfall_mm"
                  name="Avg Monthly Rainfall (mm)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="health_index"
                  name="Health Risk Index"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Global Feature Importance */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">
          Global Feature Importance Ranking Across Ensemble Models
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {globalImp.map((item: any) => (
            <div key={item.feature} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <p className="text-slate-400 truncate">{item.label}</p>
              <p className="text-lg font-extrabold text-blue-400 mt-1">{item.importance_pct}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
