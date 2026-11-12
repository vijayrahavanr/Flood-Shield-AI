import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Shield, Waves, Lock, Mail, ArrowRight } from 'lucide-react';

const DEMO_ACCOUNTS: Array<{ role: UserRole; email: string; desc: string }> = [
  { role: 'Admin', email: 'admin@floodshield.ai', desc: 'Full System, Users, Thresholds & ML Control' },
  { role: 'Disaster Management Officer', email: 'dmo@floodshield.ai', desc: 'Alerts, Evacuations, Shelters & GIS Command' },
  { role: 'Health Officer', email: 'health@floodshield.ai', desc: 'Post-Flood Health Risk, WASH & Hospitals' },
  { role: 'Analyst', email: 'analyst@floodshield.ai', desc: 'ML Models, SHAP & Sentinel-1/2 Remote Sensing' },
  { role: 'Viewer', email: 'viewer@floodshield.ai', desc: 'Read-Only Dashboard, Maps & Public Warnings' },
];

export const LoginPage: React.FC = () => {
  const { login, quickSwitchRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@floodshield.ai');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = async (role: UserRole, roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123!');
    await quickSwitchRole(role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row items-center justify-center p-6 gap-8">
      {/* Left Hero Panel */}
      <div className="max-w-lg space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
          <Waves className="w-4 h-4" /> Team Digital Pioneer — Disaster &amp; Health Intelligence
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
          FLOODSHIELD AI
        </h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          Integrated Multi-Model Flood Prediction (XGBoost, Random Forest, SHAP Explainability),
          Sentinel-1/2 NDWI &amp; SAR Remote-Sensing Inundation Mapping, Real-Time GIS Evacuation
          Command, and Post-Flood Public-Health Protection Decision-Support System.
        </p>

        {/* 1-Click Demo Role Access Cards */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            1-Click Demo Role Login (Password: Password123!)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.role}
                type="button"
                onClick={() => handleQuickRole(acct.role, acct.email)}
                className="text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300 group-hover:text-blue-200">
                    {acct.role}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{acct.email}</p>
                <p className="text-[10px] text-slate-500 mt-1">{acct.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Command Center Sign In</h2>
            <p className="text-xs text-slate-400">JWT Role-Based Access Control (RBAC)</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Official Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <Link to="/forgot-password" className="text-blue-400 hover:underline">
              Forgot Password?
            </Link>
            <Link to="/register" className="text-slate-300 hover:text-white">
              Create Officer Account &rarr;
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/25"
          >
            {loading ? 'Authenticating...' : 'Sign In to FloodShield AI'}
          </button>
        </form>
      </div>
    </div>
  );
};
