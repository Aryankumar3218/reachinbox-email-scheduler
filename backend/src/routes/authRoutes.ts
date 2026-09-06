import { Router } from 'express';
import AuthController from '../controllers/authController';

const router = Router();

router.post('/google', AuthController.googleAuth);
router.post('/login', AuthController.login);
router.get('/me', AuthController.getCurrentUser);

export default router;
