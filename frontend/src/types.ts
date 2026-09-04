export interface UserProfile {
  id?: string;
  email: string;
  name: string;
  picture?: string;
}

export interface EmailJob {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RESCHEDULED' | 'CANCELLED';
  scheduledAt: string;
  sentAt?: string | null;
  etherealPreviewUrl?: string | null;
  etherealMessageId?: string | null;
  failureReason?: string | null;
  attempts: number;
  delaySecondsApplied: number;
  hourlyLimitApplied: number;
  batchId?: string | null;
  createdAt: string;
}

export interface ScheduledEmailsResponse {
  emails: EmailJob[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SentEmailsResponse {
  emails: EmailJob[];
  total: number;
  page: number;
  totalPages: number;
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  total: number;
}

export interface DatabaseMetrics {
  scheduled: number;
  sent: number;
  failed: number;
  rescheduled: number;
  total: number;
}

export interface StatsResponse {
  queue: QueueMetrics;
  database: DatabaseMetrics;
}

export interface SlackStatus {
  isConnected: boolean;
  teamName?: string | null;
  channel?: string | null;
  hasWebhook?: boolean;
  hasOAuthToken?: boolean;
}
