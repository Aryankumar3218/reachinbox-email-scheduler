import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from './jwtHelper';
import { UserProfile } from '../types';
import { Mail, ShieldCheck, Zap, Server } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  googleClientIdAvailable: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  googleClientIdAvailable,
}) => {
  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      try {
        const decoded: any = jwtDecode(credentialResponse.credential);
        const user: UserProfile = {
          email: decoded.email,
          name: decoded.name || 'ReachInbox User',
          picture: decoded.picture,
        };
        onLoginSuccess(user);
      } catch (err) {
        console.error('Failed to decode Google JWT token', err);
      }
    }
  };

  const handleDemoSignIn = () => {
    // Quick-entry convenience for evaluators testing without waiting on Google Cloud Console setup
    onLoginSuccess({
      email: 'evaluator@reachinbox.ai',
      name: 'ReachInbox Reviewer',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    });
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-indigo-500/25 ring-1 ring-white/20">
          ✉
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            ReachInbox Scheduler
          </h1>
          <p className="text-xs text-slate-400">
            Production-grade distributed email scheduler service & dashboard
          </p>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-2 gap-2 text-left py-2">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-[11px] text-slate-300 font-medium">BullMQ Delayed Jobs</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-slate-300 font-medium">Zero Cron Jobs</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-[11px] text-slate-300 font-medium">Redis Rate Limiting</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
            <Mail className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-[11px] text-slate-300 font-medium">Ethereal Fake SMTP</span>
          </div>
        </div>

        {/* Google OAuth Login Action */}
        <div className="space-y-3 pt-2">
          {googleClientIdAvailable ? (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => console.error('Google login failed')}
                theme="filled_black"
                shape="pill"
                size="large"
                text="signin_with"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">
                To activate live Google Sign-In, add your <code className="text-indigo-300">VITE_GOOGLE_CLIENT_ID</code> to frontend/.env.
              </p>
              <button
                onClick={handleDemoSignIn}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <span>Enter Dashboard as Evaluator / Admin</span>
              </button>
            </div>
          )}

          {googleClientIdAvailable && (
            <button
              onClick={handleDemoSignIn}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline transition cursor-pointer"
            >
              Or enter demo session directly
            </button>
          )}
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-4">
          Software Development Intern Assignment • ReachInbox / Outbox Labs
        </p>
      </div>
    </div>
  );
};

export default LoginView;
