import React from 'react';
import { UserProfile, SlackStatus } from '../types';
import { LogOut, Plus, Activity, Slack, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
  slackStatus: SlackStatus | null;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenCompose,
  onOpenSlackModal,
  slackStatus,
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            ✉
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                ReachInbox
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                Scheduler v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Production Email Job Scheduler</p>
          </div>
        </div>

        {/* Action Controls & User Meta */}
        <div className="flex items-center gap-3">
          {/* Slack Connection Status Button */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              slackStatus?.isConnected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
            title="Slack Rate Limit Alert Settings"
          >
            <Slack className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {slackStatus?.isConnected ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Slack Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  Connect Slack
                </span>
              )}
            </span>
          </button>

          {/* BullMQ Dashboard Link */}
          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Open Live BullMQ Queue Board in new tab"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="hidden lg:inline">BullMQ Board</span>
          </a>

          {/* Primary Compose Button */}
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Compose New Email</span>
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full ring-2 ring-indigo-500/30 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-900/60 text-indigo-300 ring-1 ring-indigo-500/40 flex items-center justify-center font-bold text-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="hidden xl:block text-left text-xs">
                  <p className="font-semibold text-slate-200 leading-tight truncate max-w-[130px]">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate max-w-[130px]">{user.email}</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
