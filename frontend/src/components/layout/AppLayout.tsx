import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Database,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Radio,
  Settings,
  Shield,
  Siren,
  Users,
  Waves,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Command Dashboard', icon: LayoutDashboard },
  { to: '/flood-prediction', label: 'AI Flood Prediction', icon: BrainCircuit },
  { to: '/flood-map', label: 'GIS Flood Risk Map', icon: Map },
  { to: '/remote-sensing', label: 'Remote Sensing (NDWI/SAR)', icon: Radio },
  { to: '/health-risk', label: 'Post-Flood Health Risk', icon: HeartPulse },
  { to: '/alerts', label: 'Alert Engine & Warnings', icon: AlertTriangle },
  { to: '/emergency-response', label: 'Evacuation & Response', icon: Siren },
  { to: '/analytics', label: 'Climate & ML Analytics', icon: BarChart3 },
  { to: '/reports', label: 'Situation Reports', icon: FileText },
  { to: '/data-management', label: 'Data & GeoJSON Hub', icon: Database },
  { to: '/settings', label: 'API & Threshold Settings', icon: Settings },
  { to: '/user-management', label: 'Admin & RBAC Panel', icon: Users },
];

const ROLES: UserRole[] = [
  'Admin',
  'Disaster Management Officer',
  'Health Officer',
  'Analyst',
  'Viewer',
];

export const AppLayout: React.FC = () => {
  const {
    user,
    locations,
    selectedLocationId,
    setSelectedLocationId,
    quickSwitchRole,
    logout,
  } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-68 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform lg:translate-x-0 lg:static ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                FLOODSHIELD AI
              </h1>
              <p className="text-[11px] text-cyan-400 font-medium">Team: Digital Pioneer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || 'Dr. Aravind Krishnan'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded-md">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Role: {user?.role_name || 'Admin'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Header */}
        <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Activity className="w-3 h-3 animate-pulse" /> TELEMETRY LIVE
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Flood Prediction &amp; Post-Flood Health Protection Decision-Support
                </span>
              </div>
            </div>
          </div>

          {/* Basin Location Selector & Quick RBAC Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">Monitored Basin:</label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.state})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium hidden md:inline">
                RBAC Role View:
              </label>
              <select
                value={user?.role_name || 'Admin'}
                onChange={(e) => quickSwitchRole(e.target.value as UserRole)}
                className="bg-blue-950/60 border border-blue-500/40 text-blue-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="bg-slate-900 text-slate-100">
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Active Page Outlet */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
