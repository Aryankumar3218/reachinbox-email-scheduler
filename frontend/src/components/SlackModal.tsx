import React, { useState } from 'react';
import { SlackStatus } from '../types';
import apiClient from '../api';
import { X, Slack, CheckCircle2, AlertCircle, Send, Link, Unlink } from 'lucide-react';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SlackStatus | null;
  onStatusUpdated: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusUpdated,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#outreach-alerts');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      await apiClient.saveSlackWebhook(webhookUrl, channel);
      setFeedback({ type: 'success', message: 'Slack webhook saved and connected successfully.' });
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to save webhook',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      await apiClient.disconnectSlack();
      setFeedback({ type: 'success', message: 'Slack disconnected.' });
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to disconnect' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      await apiClient.testSlackNotification();
      setFeedback({
        type: 'success',
        message: 'Live test alert sent to Slack successfully. Check your channel.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to send test message',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleOAuthConnect = () => {
    window.location.href = 'http://localhost:5000/api/slack/oauth/start';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Slack className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Slack Alerts</h2>
              <p className="text-xs text-slate-500">Dispatch live notifications when hourly limits are reached</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  status?.isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  {status?.isConnected ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {status?.isConnected
                    ? `Posting to ${status.channel || '#general'}`
                    : 'Rate limit events will skip Slack notifications without disruption'}
                </p>
              </div>
            </div>

            {status?.isConnected && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestAlert}
                  disabled={testing}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  <Send className="w-3 h-3" />
                  <span>{testing ? 'Sending...' : 'Test Alert'}</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                >
                  <Unlink className="w-3 h-3" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>

          {/* Option A: Quick Incoming Webhook */}
          <form onSubmit={handleSaveWebhook} className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800">
                Incoming Webhook URL
              </label>
              <span className="text-[10px] text-slate-500">Instant connection</span>
            </div>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/T00/B00/XXXXX"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
              required
            />

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="#outreach-alerts"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-1/2 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-1/2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition disabled:opacity-50"
              >
                <Link className="w-3.5 h-3.5" />
                <span>{loading ? 'Saving...' : 'Save Webhook'}</span>
              </button>
            </div>
          </form>

          {/* Option B: Real OAuth Authorize */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Slack OAuth 2.0</span>
              <span className="text-[10px] text-slate-500">Official App Flow</span>
            </div>
            <button
              type="button"
              onClick={handleOAuthConnect}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium transition"
            >
              <Slack className="w-3.5 h-3.5" />
              <span>Authorize with Slack OAuth</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlackModal;
