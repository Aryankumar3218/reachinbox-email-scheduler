import axios from 'axios';
import prisma from '../config/db';
import redisClient from '../config/redis';

export interface SlackNotificationPayload {
  sender: string;
  limit: number;
  currentCount: number;
  hourWindow: string;
  rescheduledCount?: number;
  nextAvailableWindow?: string;
}

export class SlackService {
  /**
   * Dispatches a live Slack message when a sender reaches their hourly rate limit.
   * If Slack is not connected, gracefully bypasses notification without crashing.
   */
  public static async notifyRateLimitHit(payload: SlackNotificationPayload): Promise<{
    sent: boolean;
    reason?: string;
  }> {
    try {
      // De-duplicate notifications per sender per hour window in Redis to prevent spamming
      const dedupeKey = `slack:alerted:${payload.sender.toLowerCase()}:${payload.hourWindow}`;
      const alreadyAlerted = await redisClient.get(dedupeKey);
      if (alreadyAlerted) {
        return { sent: false, reason: 'already_alerted_this_hour' };
      }

      // Check for stored Slack configuration
      let config = await prisma.slackConfig.findFirst({
        where: { isConnected: true },
      });

      // Also check env fallback if user set SLACK_WEBHOOK_URL directly in .env
      const envWebhook = process.env.SLACK_WEBHOOK_URL;
      const targetWebhook = config?.webhookUrl || (envWebhook && envWebhook.length > 5 ? envWebhook : null);
      const botToken = config?.botAccessToken;
      const channel = config?.channel || '#general';

      if (!config && !targetWebhook && !botToken) {
        // Not connected: graceful bypass per spec
        return { sent: false, reason: 'slack_not_connected' };
      }

      const messageBlocks = {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 ReachInbox Alert: Hourly Rate Limit Hit',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `A sender has reached their maximum outbound email threshold. Outbound jobs are being *safely queued for the next hour window*.`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender:*\n\`${payload.sender}\``,
              },
              {
                type: 'mrkdwn',
                text: `*Hourly Limit:*\n${payload.limit} emails/hr`,
              },
              {
                type: 'mrkdwn',
                text: `*Attempts in Window:*\n${payload.currentCount} emails`,
              },
              {
                type: 'mrkdwn',
                text: `*Hour Window:*\n${payload.hourWindow} UTC`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '🛡️ *Idempotent BullMQ Rescheduling Active* • No jobs were dropped or lost.',
              },
            ],
          },
        ],
      };

      if (targetWebhook) {
        await axios.post(targetWebhook, messageBlocks, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        });
      } else if (botToken) {
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel,
            ...messageBlocks,
          },
          {
            headers: {
              Authorization: `Bearer ${botToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );
      }

      // Mark as notified for this window (expires in 2 hours)
      await redisClient.set(dedupeKey, '1', 'EX', 7200);
      console.log(`📣 Dispatched live Slack rate limit notification for sender: ${payload.sender}`);
      return { sent: true };
    } catch (error: any) {
      console.error('❌ Failed to send Slack notification:', error.message);
      return { sent: false, reason: error.message };
    }
  }

  /**
   * Send a test notification to verify Slack connectivity
   */
  public static async sendTestMessage(): Promise<boolean> {
    const config = await prisma.slackConfig.findFirst({
      where: { isConnected: true },
    });

    const envWebhook = process.env.SLACK_WEBHOOK_URL;
    const webhook = config?.webhookUrl || envWebhook;

    if (webhook) {
      await axios.post(webhook, {
        text: '✅ *ReachInbox Scheduler*: Slack connection verified successfully! Live notifications are active.',
      });
      return true;
    }

    if (config?.botAccessToken && config?.channel) {
      await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: config.channel,
          text: '✅ *ReachInbox Scheduler*: Slack connection verified successfully! Live notifications are active.',
        },
        {
          headers: { Authorization: `Bearer ${config.botAccessToken}` },
        }
      );
      return true;
    }

    throw new Error('No Slack webhook or token configured.');
  }
}

export default SlackService;
