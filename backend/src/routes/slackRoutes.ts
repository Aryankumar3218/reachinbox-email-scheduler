import { Router } from 'express';
import SlackController from '../controllers/slackController';

const router = Router();

router.get('/status', SlackController.getStatus);
router.post('/webhook', SlackController.saveWebhook);
router.get('/oauth/start', SlackController.startOAuth);
router.get('/oauth/callback', SlackController.oauthCallback);
router.post('/disconnect', SlackController.disconnect);
router.post('/test', SlackController.testNotification);

export default router;
