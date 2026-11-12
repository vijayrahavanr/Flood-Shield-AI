import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient, riskBadgeColor } from '../../api/client';
import { AlertTriangle, BellPlus, CheckCircle2, Filter } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { selectedLocationId } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [newAlert, setNewAlert] = useState({
    alert_type: 'Flood Alert',
    severity: 'CRITICAL',
    title: '',
    message: '',
    recommended_action: '',
  });

  const loadAlerts = async () => {
    try {
      const q = severityFilter
        ? `/alerts?location_id=${selectedLocationId}&severity=${severityFilter}`
        : `/alerts?location_id=${selectedLocationId}`;
      const res = await apiClient.get(q);
      setAlerts(res.data.alerts || []);
      setThresholds(res.data.thresholds || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [selectedLocationId, severityFilter]);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlert.title) return;
    await apiClient.post('/alerts', {
      location_id: selectedLocationId,
      ...newAlert,
    });
    setNewAlert({
      alert_type: 'Flood Alert',
      severity: 'CRITICAL',
      title: '',
      message: '',
      recommended_action: '',
    });
    loadAlerts();
  };

  const handleAcknowledge = async (id: number) => {
    await apiClient.post(`/alerts/${id}/acknowledge`);
    loadAlerts();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400" /> Real-Time Alert Engine &amp; Early Warning Dispatch
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Alert Types: Flood Alert, Extreme Rainfall Alert, River Level Alert, Evacuation Alert, Health Risk Alert, Infrastructure Risk Alert
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-slate-400" />
          {['', 'CRITICAL', 'HIGH', 'WARNING', 'INFO'].map((sev) => (
            <button
              key={sev || 'ALL'}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-md border ${
                severityFilter === sev
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {sev || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Alerts Feed */}
        <div className="lg:col-span-8 space-y-3">
          {alerts.map((al) => (
            <div
              key={al.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold border ${riskBadgeColor(
                      al.severity
                    )}`}
                  >
                    {al.severity}
                  </span>
                  <span className="text-xs font-semibold text-blue-400">{al.alert_type}</span>
                  <span className="text-[11px] text-slate-500">{al.trigger_metric}</span>
                </div>
                <h3 className="text-sm font-bold text-white">{al.title}</h3>
                <p className="text-xs text-slate-300">{al.message}</p>
                <p className="text-xs text-emerald-300">
                  <strong>Action:</strong> {al.recommended_action}
                </p>
              </div>
              <div className="shrink-0">
                {al.is_active ? (
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(al.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">
                    Acknowledged ({al.acknowledged_by})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Dispatch New Alert Form */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BellPlus className="w-4 h-4 text-amber-400" /> Dispatch New Emergency Alert
          </h3>
          <form onSubmit={handleCreateAlert} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Alert Type</label>
              <select
                value={newAlert.alert_type}
                onChange={(e) => setNewAlert({ ...newAlert, alert_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              >
                <option value="Flood Alert">Flood Alert</option>
                <option value="Extreme Rainfall Alert">Extreme Rainfall Alert</option>
                <option value="River Level Alert">River Level Alert</option>
                <option value="Evacuation Alert">Evacuation Alert</option>
                <option value="Health Risk Alert">Health Risk Alert</option>
                <option value="Infrastructure Risk Alert">Infrastructure Risk Alert</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Severity Level</label>
              <select
                value={newAlert.severity}
                onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="WARNING">WARNING</option>
                <option value="INFO">INFO</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Alert Headline</label>
              <input
                type="text"
                required
                placeholder="CRITICAL FLOOD & EMBANKMENT ALERT"
                value={newAlert.title}
                onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Detailed Situation Message</label>
              <textarea
                rows={2}
                required
                placeholder="River gauge crossed danger mark; overbank flow expected within 2 hours."
                value={newAlert.message}
                onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Recommended Field Action</label>
              <input
                type="text"
                required
                placeholder="Evacuate Zone A residents to Govt. Engineering College Shelter."
                value={newAlert.recommended_action}
                onChange={(e) => setNewAlert({ ...newAlert, recommended_action: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition"
            >
              Broadcast Emergency Alert
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
