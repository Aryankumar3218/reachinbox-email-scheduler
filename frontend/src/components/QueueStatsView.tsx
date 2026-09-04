import React, { useEffect, useState } from 'react';
import { StatsResponse } from '../types';
import apiClient from '../api';
import { Activity, ShieldCheck, Clock, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

interface QueueStatsViewProps {
  stats: StatsResponse | null;
  onRefresh: () => void;
  loading: boolean;
}

export const QueueStatsView: React.FC<QueueStatsViewProps> = ({
  stats,
  onRefresh,
  loading,
}) => {
  const [senderLimits, setSenderLimits] = useState<any[]>([]);

  const sendersToTrack = [
    'outreach@reachinbox.ai',
    'growth@outboxlabs.com',
    'partnerships@reachinbox.ai',
  ];

  const fetchSenderLimits = async () => {
    try {
      const results = await Promise.all(
        sendersToTrack.map(async (sender) => {
          const data = await apiClient.getRateLimitStatus(sender);
          return { sender, ...data };
        })
      );
      setSenderLimits(results);
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchSenderLimits();
    const interval = setInterval(fetchSenderLimits, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Bull-Board Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-100">Live BullMQ & Rate Limiter Telemetry</h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time queue health backed by Redis sorted sets (strictly no cron jobs used)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onRefresh();
              fetchSenderLimits();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>

          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition"
          >
            <span>Open Bull-Board</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Queue Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">BullMQ Delayed</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{stats?.queue.delayed ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Pending future execution</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Active Workers</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{stats?.queue.active ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Currently processing</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Waiting (Immediate)</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{stats?.queue.waiting ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Ready for pickup</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Completed (Total)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{stats?.queue.completed ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Successfully dispatched</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Failed / Retrying</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{stats?.queue.failed ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Errors caught cleanly</p>
        </div>
      </div>

      {/* Redis-backed Rate Limit Tracker */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Redis-Backed Multi-Sender Rate Limits (Current Hour Window)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Window: UTC</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {senderLimits.map((item) => {
            const percentage = Math.min(100, Math.round((item.currentCount / item.limit) * 100));
            const isNearLimit = percentage >= 80;

            return (
              <div
                key={item.sender}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-slate-300 truncate max-w-[180px]">
                    {item.sender}
                  </p>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.remaining === 0
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        : isNearLimit
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    {item.remaining === 0 ? 'Limit Reached' : `${item.remaining} left`}
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      item.remaining === 0
                        ? 'bg-rose-500'
                        : isNearLimit
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>
                    Used: <strong className="text-slate-200">{item.currentCount}</strong> / {item.limit}
                  </span>
                  <span>{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QueueStatsView;
