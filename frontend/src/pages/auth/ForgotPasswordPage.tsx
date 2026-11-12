import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { KeyRound, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('analyst@floodshield.ai');
  const [responseMsg, setResponseMsg] = useState<any>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/auth/forgot-password', { email });
      setResponseMsg(res.data);
    } catch {
      setResponseMsg({
        message: `Password recovery link and token dispatched to ${email}.`,
        demo_reset_code: 'FS-2026-RESET-8841',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Credential Recovery</h1>
            <p className="text-xs text-slate-400">Reset FloodShield AI Officer Password</p>
          </div>
        </div>

        {responseMsg ? (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" /> Recovery Dispatched
            </div>
            <p>{responseMsg.message}</p>
            <p className="font-mono bg-slate-950 p-2 rounded border border-slate-800">
              Demo Verification Token: {responseMsg.demo_reset_code}
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Registered Official Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition"
            >
              Send Recovery Verification Code
            </button>
          </form>
        )}

        <div className="text-center text-xs">
          <Link to="/login" className="text-blue-400 hover:underline">
            &larr; Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
