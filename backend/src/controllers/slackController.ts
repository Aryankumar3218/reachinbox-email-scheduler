import { Request, Response } from 'express';
import axios from 'axios';
import prisma from '../config/db';
import SlackService from '../services/slack';

export class SlackController {
  /**
   * GET /api/slack/status
   */
  public static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const config = await prisma.slackConfig.findFirst({
        where: { isConnected: true },
      });

      const envWebhook = process.env.SLACK_WEBHOOK_URL;
      const isConnected = !!config || !!(envWebhook && envWebhook.length > 5);

      res.json({
        isConnected,
        teamName: config?.teamName || (envWebhook ? 'Configured via .env' : null),
        channel: config?.channel || '#general',
        hasWebhook: !!(config?.webhookUrl || envWebhook),
        hasOAuthToken: !!config?.botAccessToken,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/slack/webhook
   * Configure a custom Incoming Webhook URL
   */
  public static async saveWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookUrl, channel } = req.body;
      if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
        res.status(400).json({ error: 'A valid Slack Incoming Webhook URL is required.' });
        return;
      }

      await prisma.slackConfig.upsert({
        where: { id: 'default' },
        update: {
          webhookUrl,
          channel: channel || '#general',
          isConnected: true,
          teamName: 'Custom Webhook Workspace',
        },
        create: {
          id: 'default',
          webhookUrl,
          channel: channel || '#general',
          isConnected: true,
          teamName: 'Custom Webhook Workspace',
        },
      });

      res.json({ success: true, message: 'Slack webhook configured successfully!' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/slack/oauth/start
   * Redirects user to Slack OAuth consent screen
   */
  public static startOAuth(req: Request, res: Response): void {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/oauth/callback';

    if (!clientId) {
      res.status(400).json({
        error: 'SLACK_CLIENT_ID is not configured. Please supply an Incoming Webhook URL instead.',
      });
      return;
    }

    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=chat:write,incoming-webhook&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;

    res.redirect(slackAuthUrl);
  }

  /**
   * GET /api/slack/oauth/callback
   * Exchanges authorization code for bot token / webhook
   */
  public static async oauthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, error } = req.query;

      if (error || !code) {
        res.redirect(`http://localhost:3000/dashboard?slack=error&reason=${error || 'cancelled'}`);
        return;
      }

      const clientId = process.env.SLACK_CLIENT_ID;
      const clientSecret = process.env.SLACK_CLIENT_SECRET;
      const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/oauth/callback';

      const tokenResponse = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: clientId || '',
          client_secret: clientSecret || '',
          code: code as string,
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      if (!tokenResponse.data.ok) {
        throw new Error(tokenResponse.data.error || 'Slack OAuth exchange failed');
      }

      const data = tokenResponse.data;
      const botAccessToken = data.access_token;
      const teamName = data.team?.name;
      const webhookUrl = data.incoming_webhook?.url;
      const channel = data.incoming_webhook?.channel || '#general';

      await prisma.slackConfig.upsert({
        where: { id: 'default' },
        update: {
          botAccessToken,
          webhookUrl,
          channel,
          teamName,
          isConnected: true,
        },
        create: {
          id: 'default',
          botAccessToken,
          webhookUrl,
          channel,
          teamName,
          isConnected: true,
        },
      });

      res.redirect('http://localhost:3000/dashboard?slack=connected');
    } catch (err: any) {
      console.error('Slack OAuth error:', err.message);
      res.redirect(`http://localhost:3000/dashboard?slack=error&message=${encodeURIComponent(err.message)}`);
    }
  }

  /**
   * POST /api/slack/disconnect
   */
  public static async disconnect(req: Request, res: Response): Promise<void> {
    try {
      await prisma.slackConfig.updateMany({
        where: { id: 'default' },
        data: { isConnected: false },
      });
      res.json({ success: true, message: 'Slack disconnected successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/slack/test
   * Sends a live test alert to Slack
   */
  public static async testNotification(req: Request, res: Response): Promise<void> {
    try {
      await SlackService.sendTestMessage();
      res.json({ success: true, message: 'Test message sent to Slack successfully!' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default SlackController;
