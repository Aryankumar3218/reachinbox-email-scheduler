import axios from 'axios';
import {
  ScheduledEmailsResponse,
  SentEmailsResponse,
  StatsResponse,
  SlackStatus,
  EmailJob,
  UserProfile,
} from './types';

const API_BASE = '/api';

export const apiClient = {
  // Emails
  scheduleEmails: async (payload: {
    recipients: string[];
    sender: string;
    subject: string;
    body: string;
    startTime?: string;
    delayBetweenSeconds: number;
    hourlyLimit: number;
    userId?: string;
  }) => {
    const res = await axios.post(`${API_BASE}/emails/schedule`, payload);
    return res.data;
  },

  getScheduledEmails: async (page = 1, limit = 20, search = ''): Promise<ScheduledEmailsResponse> => {
    const res = await axios.get(`${API_BASE}/emails/scheduled`, {
      params: { page, limit, search },
    });
    return res.data;
  },

  getSentEmails: async (page = 1, limit = 20, search = ''): Promise<SentEmailsResponse> => {
    const res = await axios.get(`${API_BASE}/emails/sent`, {
      params: { page, limit, search },
    });
    return res.data;
  },

  searchEmails: async (query: string, status?: string): Promise<{ results: EmailJob[]; total: number; source: string }> => {
    const res = await axios.get(`${API_BASE}/emails/search`, {
      params: { q: query, status },
    });
    return res.data;
  },

  cancelEmail: async (id: string) => {
    const res = await axios.delete(`${API_BASE}/emails/${id}`);
    return res.data;
  },

  getStats: async (): Promise<StatsResponse> => {
    const res = await axios.get(`${API_BASE}/emails/stats`);
    return res.data;
  },

  getRateLimitStatus: async (sender: string, limit?: number) => {
    const res = await axios.get(`${API_BASE}/emails/ratelimit-status`, {
      params: { sender, limit },
    });
    return res.data;
  },

  // Slack
  getSlackStatus: async (): Promise<SlackStatus> => {
    const res = await axios.get(`${API_BASE}/slack/status`);
    return res.data;
  },

  saveSlackWebhook: async (webhookUrl: string, channel?: string) => {
    const res = await axios.post(`${API_BASE}/slack/webhook`, { webhookUrl, channel });
    return res.data;
  },

  disconnectSlack: async () => {
    const res = await axios.post(`${API_BASE}/slack/disconnect`);
    return res.data;
  },

  testSlackNotification: async () => {
    const res = await axios.post(`${API_BASE}/slack/test`);
    return res.data;
  },

  // Auth
  syncGoogleUser: async (user: UserProfile & { accessToken?: string }) => {
    const res = await axios.post(`${API_BASE}/auth/google`, user);
    return res.data;
  },
};

export default apiClient;
