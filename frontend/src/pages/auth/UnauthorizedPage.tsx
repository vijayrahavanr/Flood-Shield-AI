import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  const { user, quickSwitchRole } = useAuth();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-red-500/40 rounded-2xl p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white">Insufficient Role Clearance</h1>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your current active role (<strong>{user?.role_name || 'Viewer'}</strong>) does not have
          permission to execute this restricted command operation.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <button
            type="button"
            onClick={() => quickSwitchRole('Admin')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Switch to Admin Role (Demo)
          </button>
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
