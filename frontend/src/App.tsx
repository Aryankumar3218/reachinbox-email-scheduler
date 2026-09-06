import React, { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProfile, EmailJob, StatsResponse, SlackStatus } from './types';
import apiClient from './api';

import Header from './components/Header';
import ScheduledTable from './components/ScheduledTable';
import SentTable from './components/SentTable';
import QueueStatsView from './components/QueueStatsView';
import ComposeModal from './components/ComposeModal';
import SlackModal from './components/SlackModal';
import LoginView from './components/LoginView';

import { Calendar, CheckCircle2, Activity, Check, AlertCircle } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('reachinbox_user');
    return cached ? JSON.parse(cached) : null;
  });

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'analytics'>('scheduled');

  // Scheduled tab state
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledTotalPages, setScheduledTotalPages] = useState(1);
  const [scheduledSearch, setScheduledSearch] = useState('');

  // Sent tab state
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentPage, setSentPage] = useState(1);
  const [sentTotalPages, setSentTotalPages] = useState(1);
  const [sentSearch, setSentSearch] = useState('');

  // Stats & Slack state
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  // Modals state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoginSuccess = async (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('reachinbox_user', JSON.stringify(profile));
    try {
      await apiClient.syncGoogleUser(profile);
    } catch (err) {
      // Non-blocking
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('reachinbox_user');
  };

  // Fetch Scheduled Emails
  const fetchScheduled = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const data = await apiClient.getScheduledEmails(scheduledPage, 15, scheduledSearch);
      setScheduledEmails(data.emails);
      setScheduledTotal(data.total);
      setScheduledTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch scheduled emails', err);
    } finally {
      setScheduledLoading(false);
    }
  }, [scheduledPage, scheduledSearch]);

  // Fetch Sent Emails
  const fetchSent = useCallback(async () => {
    setSentLoading(true);
    try {
      const data = await apiClient.getSentEmails(sentPage, 15, sentSearch);
      setSentEmails(data.emails);
      setSentTotal(data.total);
      setSentTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch sent emails', err);
    } finally {
      setSentLoading(false);
    }
  }, [sentPage, sentSearch]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await apiClient.getStats();
      setStats(data);
    } catch (err) {
      // Non-blocking
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Slack Status
  const fetchSlackStatus = useCallback(async () => {
    try {
      const data = await apiClient.getSlackStatus();
      setSlackStatus(data);
    } catch (err) {
      // Non-blocking
    }
  }, []);

  // Handle URL params for Slack OAuth return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const slackParam = urlParams.get('slack');
    if (slackParam === 'connected') {
      showToast('Slack workspace connected successfully.', 'success');
      fetchSlackStatus();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (slackParam === 'error') {
      showToast('Slack authorization failed or was cancelled.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchSlackStatus]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchScheduled();
      fetchSent();
      fetchStats();
      fetchSlackStatus();
    }
  }, [user, fetchScheduled, fetchSent, fetchStats, fetchSlackStatus]);

  // Auto-polling every 3 seconds for real-time updates as BullMQ workers send emails
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchScheduled();
      fetchSent();
      fetchStats();
    }, 3000);
    return () => clearInterval(interval);
  }, [user, fetchScheduled, fetchSent, fetchStats]);

  const handleCancelEmail = async (id: string) => {
    try {
      await apiClient.cancelEmail(id);
      showToast('Email job cancelled successfully.');
      fetchScheduled();
      fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel job', 'error');
    }
  };

  const handleScheduleSubmit = async (payload: any) => {
    await apiClient.scheduleEmails({
      ...payload,
      userId: user?.id,
    });
    showToast(`Successfully queued ${payload.recipients.length} email(s).`);
    fetchScheduled();
    fetchStats();
  };

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'dummy-client-id'}>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          googleClientIdAvailable={!!GOOGLE_CLIENT_ID}
        />
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'dummy-client-id'}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {/* Header */}
        <Header
          user={user}
          onLogout={handleLogout}
          onOpenCompose={() => setIsComposeOpen(true)}
          onOpenSlackModal={() => setIsSlackModalOpen(true)}
          slackStatus={slackStatus}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl">
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'scheduled'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Scheduled</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
                  {scheduledTotal}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('sent')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'sent'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sent History</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
                  {sentTotal}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'analytics'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-indigo-600" />
                <span>Queue & Limits</span>
              </button>
            </div>
          </div>

          {/* Tab Views */}
          {activeTab === 'scheduled' && (
            <ScheduledTable
              emails={scheduledEmails}
              loading={scheduledLoading}
              total={scheduledTotal}
              page={scheduledPage}
              search={scheduledSearch}
              onSearchChange={(val) => {
                setScheduledSearch(val);
                setScheduledPage(1);
              }}
              onRefresh={fetchScheduled}
              onCancelJob={handleCancelEmail}
              onPageChange={(p) => setScheduledPage(p)}
              totalPages={scheduledTotalPages}
            />
          )}

          {activeTab === 'sent' && (
            <SentTable
              emails={sentEmails}
              loading={sentLoading}
              total={sentTotal}
              page={sentPage}
              search={sentSearch}
              onSearchChange={(val) => {
                setSentSearch(val);
                setSentPage(1);
              }}
              onRefresh={fetchSent}
              onPageChange={(p) => setSentPage(p)}
              totalPages={sentTotalPages}
            />
          )}

          {activeTab === 'analytics' && (
            <QueueStatsView
              stats={stats}
              onRefresh={fetchStats}
              loading={statsLoading}
            />
          )}
        </main>

        {/* Modals */}
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          onScheduledSuccess={() => {
            fetchScheduled();
            fetchStats();
          }}
          onSchedule={handleScheduleSubmit}
        />

        <SlackModal
          isOpen={isSlackModalOpen}
          onClose={() => setIsSlackModalOpen(false)}
          status={slackStatus}
          onStatusUpdated={fetchSlackStatus}
        />

        {/* Toast notifications */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-xs font-medium border bg-white ${
                toast.type === 'success'
                  ? 'border-emerald-200 text-slate-800'
                  : 'border-rose-200 text-slate-800'
              }`}
            >
              {toast.type === 'success' ? (
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
