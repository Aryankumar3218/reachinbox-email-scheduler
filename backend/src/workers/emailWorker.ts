import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from '../queues/emailQueue';
import { getSmtpTransporter, getPreviewUrl } from '../config/smtp';
import RateLimiterService from '../services/rateLimiter';
import SlackService from '../services/slack';
import SearchService from '../services/search';
import prisma from '../config/db';

const workerConcurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const data = job.data;
    console.log(`\n⏳ [Worker] Processing job ${job.id} for recipient: ${data.recipient} (Sender: ${data.sender})`);

    // Verify job hasn't been cancelled in DB
    const existingDbRecord = await prisma.emailJob.findUnique({
      where: { id: data.id },
    });

    if (!existingDbRecord) {
      console.warn(`[Worker] Job ${data.id} not found in DB. Skipping.`);
      return { skipped: true, reason: 'not_found' };
    }

    if (existingDbRecord.status === 'SENT') {
      console.log(`[Worker] Job ${data.id} already marked SENT. Skipping duplicate execution.`);
      return { skipped: true, reason: 'already_sent' };
    }

    // 1. Check Hourly Rate Limit across distributed workers (Redis-backed)
    const limitCheck = await RateLimiterService.checkAndIncrement(
      data.sender,
      data.hourlyLimitApplied
    );

    if (!limitCheck.allowed) {
      console.warn(
        `🚨 [Worker] Rate limit reached for ${data.sender} (${limitCheck.currentCount - 1}/${limitCheck.limit} used in window ${limitCheck.hourWindow}). Rescheduling to next window (+${Math.round(limitCheck.nextWindowDelayMs / 1000)}s)...`
      );

      // Trigger verifiable Slack alert
      await SlackService.notifyRateLimitHit({
        sender: data.sender,
        limit: limitCheck.limit,
        currentCount: limitCheck.currentCount - 1,
        hourWindow: limitCheck.hourWindow,
      });

      // Reschedule into next available hour window preserving order
      const newScheduledDate = new Date(Date.now() + limitCheck.nextWindowDelayMs);
      await prisma.emailJob.update({
        where: { id: data.id },
        data: {
          status: 'RESCHEDULED',
          scheduledAt: newScheduledDate,
          attempts: { increment: 1 },
        },
      });

      // Update Elasticsearch
      await SearchService.updateEmail(data.id, {
        status: 'RESCHEDULED',
        scheduledAt: newScheduledDate,
      });

      // Re-enqueue in BullMQ with computed delay
      await emailQueue.add('send-email', data, {
        delay: limitCheck.nextWindowDelayMs,
        jobId: `rescheduled-${data.id}-${Date.now()}`,
      });

      return {
        rescheduled: true,
        reason: 'rate_limit_exceeded',
        nextRunAt: newScheduledDate.toISOString(),
      };
    }

    // 2. Provider Throttling Delay between individual emails
    const delaySeconds = data.delaySecondsApplied || parseInt(process.env.DEFAULT_DELAY_BETWEEN_EMAILS_SECONDS || '2', 10);
    if (delaySeconds > 0) {
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
    }

    // 3. Mark DB as PROCESSING
    await prisma.emailJob.update({
      where: { id: data.id },
      data: { status: 'PROCESSING' },
    });

    try {
      // 4. Send email via Ethereal SMTP transporter
      const transporter = await getSmtpTransporter();
      const sendResult = await transporter.sendMail({
        from: `"${data.sender.split('@')[0]}" <${data.sender}>`,
        to: data.recipient,
        subject: data.subject,
        text: data.body,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
          ${data.body.replace(/\n/g, '<br/>')}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
          <p style="font-size: 11px; color: #94a3b8;">Sent via ReachInbox Scheduler Testbed (Ethereal SMTP)</p>
        </div>`,
      });

      const previewUrl = getPreviewUrl(sendResult) || undefined;
      const sentAt = new Date();

      console.log(`✅ [Worker] Sent email ${data.id} to ${data.recipient}`);
      if (previewUrl) {
        console.log(`🔗 [Worker] Ethereal Preview URL: ${previewUrl}`);
      }

      // 5. Update Database Record to SENT
      await prisma.emailJob.update({
        where: { id: data.id },
        data: {
          status: 'SENT',
          sentAt,
          etherealMessageId: sendResult.messageId,
          etherealPreviewUrl: previewUrl || null,
        },
      });

      // 6. Update Elasticsearch Document
      await SearchService.updateEmail(data.id, {
        status: 'SENT',
        sentAt,
      });

      return {
        success: true,
        messageId: sendResult.messageId,
        previewUrl,
        sentAt,
      };
    } catch (sendError: any) {
      console.error(`❌ [Worker] Failed sending email ${data.id}:`, sendError.message);

      await prisma.emailJob.update({
        where: { id: data.id },
        data: {
          status: 'FAILED',
          failureReason: sendError.message,
          attempts: { increment: 1 },
        },
      });

      await SearchService.updateEmail(data.id, {
        status: 'FAILED',
      });

      throw sendError;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: workerConcurrency,
    limiter: {
      max: 100,
      duration: 1000,
    },
  }
);

emailWorker.on('completed', (job) => {
  console.log(`✨ [Worker] Completed job ${job.id}`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`💥 [Worker] Job ${job?.id} failed with error:`, err.message);
});

export default emailWorker;
