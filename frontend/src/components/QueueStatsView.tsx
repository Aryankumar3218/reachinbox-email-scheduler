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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Queue & Rate Limit Telemetry</h2>
          </div>
          <p className="text-xs text-slate-500">
            Real-time job queue states backed by Redis sorted sets (strictly event-driven, zero cron)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              onRefresh();
              fetchSenderLimits();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
          >
            <span>Open Bull-Board</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Queue Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Delayed</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.queue.delayed ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Pending send timestamp</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Active</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.queue.active ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Currently processing</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Waiting</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.queue.waiting ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Ready for pickup</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.queue.completed ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Sent successfully</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Failed</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.queue.failed ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Errors captured</p>
        </div>
      </div>

      {/* Redis-backed Rate Limit Tracker */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Hourly Sender Rate Limits (Current Window)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Atomic Redis Counters</span>
        </div>

        <div className="space-y-3">
          {senderLimits.map((item) => {
            const limit = item.hourlyLimit || 20;
            const sent = item.sentCount || 0;
            const percent = Math.min(100, Math.round((sent / limit) * 100));
            const isNearLimit = percent >= 80;

            return (
              <div
                key={item.sender}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-800 font-mono">{item.sender}</p>
                  <p className="text-[11px] text-slate-500">
                    Window: <code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-[10px]">{item.hourWindow || 'current'}</code>
                  </p>
                </div>

                <div className="w-full sm:w-64 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{sent} / {limit} sent</span>
                    <span className={`font-semibold ${isNearLimit ? 'text-amber-600' : 'text-slate-700'}`}>
                      {percent}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percent >= 100
                          ? 'bg-rose-500'
                          : isNearLimit
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
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
