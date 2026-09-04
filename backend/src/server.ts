import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { emailQueue, enqueueEmailJob } from './queues/emailQueue';
import './workers/emailWorker'; // Start worker process
import prisma from './config/db';
import { initElasticsearch } from './config/elasticsearch';
import { getSmtpTransporter } from './config/smtp';

import emailRoutes from './routes/emailRoutes';
import slackRoutes from './routes/slackRoutes';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Live BullMQ Dashboard mounted at /admin/queues (Assignment requirement)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// 2. REST API Routes
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'reachinbox-email-scheduler',
  });
});

/**
 * Boot Reconciliation Routine:
 * Ensures complete survival across server restarts without losing or duplicating jobs.
 */
async function reconcileScheduledJobsOnBoot() {
  console.log('🔍 Checking database for pending scheduled jobs to reconcile on boot...');
  try {
    const pendingJobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
      },
    });

    console.log(`📋 Found ${pendingJobs.length} pending email job(s) in database.`);

    for (const job of pendingJobs) {
      const existingQueueJob = await emailQueue.getJob(`email-${job.id}`);
      if (!existingQueueJob) {
        // Job not in queue (e.g. Redis restart without snapshot); re-enqueue safely
        const delayMs = Math.max(0, new Date(job.scheduledAt).getTime() - Date.now());
        console.log(`♻️ Restoring job ${job.id} for ${job.recipient} into BullMQ (delay: ${Math.round(delayMs / 1000)}s)`);
        await enqueueEmailJob(
          {
            id: job.id,
            recipient: job.recipient,
            sender: job.sender,
            subject: job.subject,
            body: job.body,
            scheduledAt: job.scheduledAt.toISOString(),
            hourlyLimitApplied: job.hourlyLimitApplied,
            delaySecondsApplied: job.delaySecondsApplied,
            userId: job.userId,
            batchId: job.batchId,
          },
          delayMs
        );
      }
    }
  } catch (err: any) {
    console.error('⚠️ Error during boot reconciliation:', err.message);
  }
}

// Start Server
app.listen(PORT, async () => {
  console.log(`
=====================================================
🚀 ReachInbox Email Scheduler API Server Running!
📡 Port:                 ${PORT}
📊 Live BullMQ Board:    http://localhost:${PORT}/admin/queues
📨 API Endpoints:        http://localhost:${PORT}/api/emails
=====================================================
  `);

  // Initialize infrastructure services
  await initElasticsearch();
  await getSmtpTransporter();
  await reconcileScheduledJobsOnBoot();
});

export default app;
