import { Router } from 'express';
import EmailController from '../controllers/emailController';

const router = Router();

router.post('/schedule', EmailController.scheduleEmails);
router.get('/scheduled', EmailController.getScheduledEmails);
router.get('/sent', EmailController.getSentEmails);
router.get('/search', EmailController.searchEmails);
router.get('/stats', EmailController.getStats);
router.get('/ratelimit-status', EmailController.getRateLimitStatus);
router.delete('/:id', EmailController.cancelEmail);

export default router;
