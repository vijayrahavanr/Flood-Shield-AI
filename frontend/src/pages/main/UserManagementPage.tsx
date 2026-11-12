import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { Users, Shield, ScrollText, BrainCircuit, RefreshCw, MapPin } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [retraining, setRetraining] = useState(false);

  const loadAdminData = async () => {
    try {
      const [uRes, lRes, mRes] = await Promise.all([
        apiClient.get('/admin/users'),
        apiClient.get('/admin/logs'),
        apiClient.get('/flood/models'),
      ]);
      setUsers(uRes.data.users || []);
      setRoles(uRes.data.roles || []);
      setLogs(lRes.data.logs || []);
      setModelStatus(mRes.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    await apiClient.put(`/admin/users/${userId}`, { role_name: newRole });
    loadAdminData();
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await apiClient.post('/flood/retrain');
      await loadAdminData();
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" /> Admin Command Panel — Users, RBAC Roles, AI Models &amp; System Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage officer role assignments, inspect RBAC permissions, retrain ML models, and audit system logs.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRetrain}
          disabled={retraining}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
          {retraining ? 'Retraining Ensemble...' : 'Retrain AI Flood Models'}
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" /> Registered Officers &amp; Role-Based Access Control
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase">
              <tr>
                <th className="p-2.5">ID</th>
                <th className="p-2.5">Full Name</th>
                <th className="p-2.5">Official Email</th>
                <th className="p-2.5">Organization</th>
                <th className="p-2.5">Assigned RBAC Role</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-2.5 font-mono text-slate-400">#{u.id}</td>
                  <td className="p-2.5 font-semibold text-white">{u.full_name}</td>
                  <td className="p-2.5 text-blue-300">{u.email}</td>
                  <td className="p-2.5 text-slate-300">{u.organization}</td>
                  <td className="p-2.5">
                    <select
                      value={u.role_name}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles & System Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <h3 className="text-sm font-bold text-white">RBAC Role Matrix</h3>
          {roles.map((r) => (
            <div key={r.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <p className="font-bold text-blue-300">{r.name}</p>
              <p className="text-slate-400 mt-0.5">{r.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-amber-400" /> System Audit Logs
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {logs.map((lg) => (
              <div key={lg.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-300">[{lg.module}]</span>
                  <span className="text-slate-500">{lg.user_email}</span>
                </div>
                <p className="text-white font-medium mt-0.5">{lg.action}</p>
                {lg.details && <p className="text-[11px] text-slate-400">{lg.details}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
