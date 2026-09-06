import React from 'react';
import { UserProfile, SlackStatus } from '../types';
import { LogOut, Plus, Activity, Slack, CheckCircle2, AlertCircle, Mail } from 'lucide-react';

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
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 tracking-tight">
                ReachInbox
              </span>
              <span className="text-[10px] font-medium tracking-wide bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                Scheduler
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Outbound Email Campaign Engine</p>
          </div>
        </div>

        {/* Action Controls & User Meta */}
        <div className="flex items-center gap-2.5">
          {/* Slack Connection Status Button */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
              slackStatus?.isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Configure Slack Alerts"
          >
            <Slack className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {slackStatus?.isConnected ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Slack Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
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
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition"
            title="Open Live BullMQ Queue Board in a new tab"
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden lg:inline">Queue Telemetry</span>
          </a>

          {/* Primary Compose Button */}
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Compose Email</span>
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 ml-1">
              <div className="flex items-center gap-2">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-semibold text-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="hidden xl:block text-left text-xs">
                  <p className="font-semibold text-slate-900 leading-tight truncate max-w-[130px]">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate max-w-[130px]">{user.email}</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition"
                title="Log out"
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
