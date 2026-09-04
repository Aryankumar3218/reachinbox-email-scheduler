import { Router } from 'express';
import AuthController from '../controllers/authController';

const router = Router();

router.post('/google', AuthController.googleAuth);
router.get('/me', AuthController.getCurrentUser);

export default router;
