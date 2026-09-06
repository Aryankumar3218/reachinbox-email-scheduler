import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from './jwtHelper';
import { UserProfile } from '../types';
import apiClient from '../api';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Zap,
  Clock,
  BarChart2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Zap className="w-4 h-4 text-blue-400" />,
    title: 'Smart Scheduling',
    desc: 'Queue thousands of emails with intelligent delay and throttle controls.',
  },
  {
    icon: <Clock className="w-4 h-4 text-blue-400" />,
    title: 'Real-time Tracking',
    desc: 'Live dashboard updates as your emails move through the queue.',
  },
  {
    icon: <BarChart2 className="w-4 h-4 text-blue-400" />,
    title: 'Analytics & Limits',
    desc: 'Monitor hourly send rates, failures, and delivery stats at a glance.',
  },
];

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  googleClientIdAvailable: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  googleClientIdAvailable,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle Email + Password submit
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 3) {
      setError('Password must be at least 3 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.loginWithCredentials({
        email: email.trim(),
        password,
      });

      if (res.success && res.user) {
        setSuccess(true);
        setTimeout(() => onLoginSuccess(res.user), 600);
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Could not connect to authentication service.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for convenience
  const handleFillDemo = () => {
    setEmail('admin@reachinbox.ai');
    setPassword('reachinbox123');
    setError(null);
  };

  // Google OAuth handler
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

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 text-white relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">ReachInbox</span>
        </div>

        {/* Middle copy */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold leading-tight">
              Deliver emails<br />at scale, on time.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xs">
              The all-in-one email scheduling platform for modern outreach teams.
            </p>
          </div>

          <ul className="space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <div className="mt-0.5 w-7 h-7 rounded-md bg-blue-900/60 flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom footer */}
        <p className="text-xs text-slate-500 relative z-10">
          Software Development Intern Assignment • ReachInbox © 2024
        </p>
      </div>

      {/* ── Right panel: login form ── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm space-y-7">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">ReachInbox</span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-500">
              Sign in with your Email ID and password to continue.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Success banner */}
          {success && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Login successful! Redirecting…</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleCredentialSubmit} className="space-y-4">
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Email ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium transition"
                >
                  Use demo credentials
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg pl-9 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-slate-200" />
            <span className="mx-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              or continue with
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Google OAuth */}
          <div>
            {googleClientIdAvailable ? (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in was cancelled or failed.')}
                  shape="rectangular"
                  size="large"
                  text="signin_with"
                  width={320}
                />
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center bg-slate-100 rounded-lg py-3 px-4">
                Google OAuth not configured.{' '}
                <span className="text-blue-600 font-medium">Use email login above.</span>
              </p>
            )}
          </div>

          {/* Bottom note */}
          <p className="text-[11px] text-slate-400 text-center">
            By signing in you agree to the ReachInbox{' '}
            <span className="text-blue-600 cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-blue-600 cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
