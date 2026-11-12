import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { Settings, KeyRound, Save, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [savedMsg, setSavedMsg] = useState('');

  const loadThresholds = async () => {
    try {
      const res = await apiClient.get('/alerts');
      setThresholds(res.data.thresholds || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadThresholds();
  }, []);

  const handleSaveThreshold = async (t: any) => {
    await apiClient.put(`/alerts/thresholds/${t.id}`, {
      warning_threshold: Number(t.warning_threshold),
      high_threshold: Number(t.high_threshold),
      critical_threshold: Number(t.critical_threshold),
    });
    setSavedMsg(`Updated threshold for ${t.metric_label}`);
    setTimeout(() => setSavedMsg(''), 3000);
    loadThresholds();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" /> System Configuration, External API Adapters &amp; Alert Thresholds
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure threshold triggers and inspect external weather, river gauge, and satellite API integration adapters.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {savedMsg}
        </div>
      )}

      {/* Configurable Alert Thresholds */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Configurable Alert Engine Thresholds</h3>
        <div className="space-y-2.5 text-xs">
          {thresholds.map((t, idx) => (
            <div
              key={t.id}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-6 items-center gap-3"
            >
              <div className="md:col-span-2">
                <p className="font-bold text-white">{t.metric_label}</p>
                <p className="text-[11px] text-slate-400">
                  Alert Type: {t.alert_type} ({t.unit})
                </p>
              </div>
              <div>
                <label className="block text-[10px] text-yellow-400">Warning</label>
                <input
                  type="number"
                  value={t.warning_threshold}
                  onChange={(e) => {
                    const copy = [...thresholds];
                    copy[idx].warning_threshold = e.target.value;
                    setThresholds(copy);
                  }}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-amber-400">High</label>
                <input
                  type="number"
                  value={t.high_threshold}
                  onChange={(e) => {
                    const copy = [...thresholds];
                    copy[idx].high_threshold = e.target.value;
                    setThresholds(copy);
                  }}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-red-400">Critical</label>
                <input
                  type="number"
                  value={t.critical_threshold}
                  onChange={(e) => {
                    const copy = [...thresholds];
                    copy[idx].critical_threshold = e.target.value;
                    setThresholds(copy);
                  }}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => handleSaveThreshold(t)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold inline-flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* External API Key & Fallback Architecture Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-cyan-400" /> External API Adapters &amp; Zero-Cost Fallback Mode
        </h3>
        <p className="text-slate-300">
          FloodShield AI runs out-of-the-box using deterministic hydro-meteorological and satellite
          demo adapters. To switch to live external feeds, populate your <code>.env</code> file:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <p className="font-bold text-cyan-300">1. WeatherService &amp; ClimateService</p>
            <p className="text-slate-400 mt-1">
              Set <code>OPENWEATHER_API_KEY</code> in <code>.env</code> for live OpenWeatherMap
              telemetry; NASA POWER API requires no paid key.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <p className="font-bold text-cyan-300">2. RemoteSensingService (Sentinel-1/2)</p>
            <p className="text-slate-400 mt-1">
              Set <code>COPERNICUS_CLIENT_ID</code> and <code>COPERNICUS_CLIENT_SECRET</code> for
              live Copernicus Data Space Sentinel-1 SAR &amp; Sentinel-2 MSI scenes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
