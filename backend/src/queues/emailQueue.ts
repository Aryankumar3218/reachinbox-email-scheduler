import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';

export interface EmailJobData {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  body: string;
  scheduledAt: string;
  hourlyLimitApplied: number;
  delaySecondsApplied: number;
  userId?: string | null;
  batchId?: string | null;
}

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false, // Retain for Bull-Board inspection
    removeOnFail: false,
  },
});

/**
 * Enqueues an email for scheduled delivery via BullMQ delayed jobs.
 * Strictly avoids any cron jobs. Idempotent via unique jobId.
 */
export async function enqueueEmailJob(jobData: EmailJobData, delayMs: number) {
  const safeDelay = Math.max(0, Math.floor(delayMs));
  return await emailQueue.add('send-email', jobData, {
    delay: safeDelay,
    jobId: `email-${jobData.id}`, // Idempotent key
  });
}

export default emailQueue;
