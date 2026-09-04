import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { emailQueue, enqueueEmailJob } from '../queues/emailQueue';
import SearchService from '../services/search';
import RateLimiterService from '../services/rateLimiter';

export class EmailController {
  /**
   * POST /api/emails/schedule
   * Schedules a single email or batch of emails using BullMQ delayed jobs (NO CRON).
   */
  public static async scheduleEmails(req: Request, res: Response): Promise<void> {
    try {
      const {
        recipients,
        sender,
        subject,
        body,
        startTime,
        delayBetweenSeconds = 2,
        hourlyLimit = 20,
        userId,
      } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ error: 'Recipients array is required and must not be empty.' });
        return;
      }

      if (!sender || !subject || !body) {
        res.status(400).json({ error: 'Sender, subject, and body are required fields.' });
        return;
      }

      const batchId = crypto.randomUUID();
      const baseStartTime = startTime ? new Date(startTime) : new Date();
      const delayBetweenMs = Math.max(0, Number(delayBetweenSeconds)) * 1000;
      const hourlyLimitNum = Math.max(1, Number(hourlyLimit));

      const createdJobs = [];

      for (let i = 0; i < recipients.length; i++) {
        const rawRecipient = recipients[i];
        const recipientEmail = typeof rawRecipient === 'string' ? rawRecipient.trim() : rawRecipient.email?.trim();

        if (!recipientEmail || !recipientEmail.includes('@')) {
          continue;
        }

        // Stagger each recipient in the batch by delayBetweenMs starting from baseStartTime
        const scheduledTimestamp = new Date(baseStartTime.getTime() + i * delayBetweenMs);
        const initialDelayMs = Math.max(0, scheduledTimestamp.getTime() - Date.now());

        // 1. Create DB record for persistence & restart survival
        const emailRecord = await prisma.emailJob.create({
          data: {
            recipient: recipientEmail,
            sender: sender.trim(),
            subject,
            body,
            status: 'SCHEDULED',
            scheduledAt: scheduledTimestamp,
            delaySecondsApplied: Number(delayBetweenSeconds),
            hourlyLimitApplied: hourlyLimitNum,
            batchId,
            userId: userId || null,
          },
        });

        // 2. Schedule delayed job in BullMQ (idempotent, no cron)
        await enqueueEmailJob(
          {
            id: emailRecord.id,
            recipient: emailRecord.recipient,
            sender: emailRecord.sender,
            subject: emailRecord.subject,
            body: emailRecord.body,
            scheduledAt: emailRecord.scheduledAt.toISOString(),
            hourlyLimitApplied: emailRecord.hourlyLimitApplied,
            delaySecondsApplied: emailRecord.delaySecondsApplied,
            userId: emailRecord.userId,
            batchId,
          },
          initialDelayMs
        );

        // 3. Index into Elasticsearch
        await SearchService.indexEmail({
          id: emailRecord.id,
          userId: emailRecord.userId,
          recipient: emailRecord.recipient,
          sender: emailRecord.sender,
          subject: emailRecord.subject,
          body: emailRecord.body,
          status: emailRecord.status,
          scheduledAt: emailRecord.scheduledAt,
          createdAt: emailRecord.createdAt,
        });

        createdJobs.push(emailRecord);
      }

      res.status(201).json({
        success: true,
        message: `Successfully scheduled ${createdJobs.length} email(s).`,
        batchId,
        count: createdJobs.length,
        jobs: createdJobs,
      });
    } catch (error: any) {
      console.error('Error in scheduleEmails:', error);
      res.status(500).json({ error: error.message || 'Internal server error while scheduling emails.' });
    }
  }

  /**
   * GET /api/emails/scheduled
   * Returns list of scheduled and pending emails.
   */
  public static async getScheduledEmails(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || '';

      const where: any = {
        status: { in: ['SCHEDULED', 'RESCHEDULED', 'PROCESSING'] },
      };

      if (search.trim()) {
        where.OR = [
          { recipient: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { sender: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [emails, total] = await Promise.all([
        prisma.emailJob.findMany({
          where,
          orderBy: { scheduledAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.emailJob.count({ where }),
      ]);

      res.json({
        emails,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/emails/sent
   * Returns list of sent and failed emails with Ethereal preview URLs.
   */
  public static async getSentEmails(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || '';

      const where: any = {
        status: { in: ['SENT', 'FAILED'] },
      };

      if (search.trim()) {
        where.OR = [
          { recipient: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { sender: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [emails, total] = await Promise.all([
        prisma.emailJob.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.emailJob.count({ where }),
      ]);

      res.json({
        emails,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/emails/search
   * Full-text search via Elasticsearch with database fallback.
   */
  public static async searchEmails(req: Request, res: Response): Promise<void> {
    try {
      const query = (req.query.q as string) || '';
      const status = req.query.status as string | undefined;
      const sender = req.query.sender as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const results = await SearchService.searchEmails(query, { status, sender }, page, limit);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/emails/:id
   * Cancels a scheduled email from queue and marks it CANCELLED in DB.
   */
  public static async cancelEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const record = await prisma.emailJob.findUnique({ where: { id } });
      if (!record) {
        res.status(404).json({ error: 'Email job not found' });
        return;
      }

      // Remove from BullMQ if still delayed
      try {
        const job = await emailQueue.getJob(`email-${id}`);
        if (job) {
          await job.remove();
        }
      } catch (err) {
        // Job might not exist or already completed
      }

      await prisma.emailJob.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await SearchService.updateEmail(id, { status: 'CANCELLED' });

      res.json({ success: true, message: 'Email job cancelled successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/emails/stats
   * Real-time BullMQ and DB metrics.
   */
  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [waiting, active, delayed, completed, failed] = await Promise.all([
        emailQueue.getWaitingCount(),
        emailQueue.getActiveCount(),
        emailQueue.getDelayedCount(),
        emailQueue.getCompletedCount(),
        emailQueue.getFailedCount(),
      ]);

      const [dbScheduled, dbSent, dbFailed, dbRescheduled] = await Promise.all([
        prisma.emailJob.count({ where: { status: 'SCHEDULED' } }),
        prisma.emailJob.count({ where: { status: 'SENT' } }),
        prisma.emailJob.count({ where: { status: 'FAILED' } }),
        prisma.emailJob.count({ where: { status: 'RESCHEDULED' } }),
      ]);

      res.json({
        queue: {
          waiting,
          active,
          delayed,
          completed,
          failed,
          total: waiting + active + delayed,
        },
        database: {
          scheduled: dbScheduled,
          sent: dbSent,
          failed: dbFailed,
          rescheduled: dbRescheduled,
          total: dbScheduled + dbSent + dbFailed + dbRescheduled,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/emails/ratelimit-status
   * Inspect current sender rate limits.
   */
  public static async getRateLimitStatus(req: Request, res: Response): Promise<void> {
    try {
      const sender = (req.query.sender as string) || 'outreach@reachinbox.ai';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const status = await RateLimiterService.getCurrentUsage(sender, limit);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default EmailController;
