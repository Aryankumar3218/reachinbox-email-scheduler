import { Request, Response } from 'express';
import axios from 'axios';
import prisma from '../config/db';

export class AuthController {
  /**
   * POST /api/auth/google
   * Receives Google user info / token from frontend, creates or updates User record, returns user session
   */
  public static async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, picture, googleId, accessToken } = req.body;

      let verifiedEmail = email;
      let verifiedName = name;
      let verifiedPicture = picture;
      let verifiedGoogleId = googleId;

      // If an accessToken or idToken is provided, verify with Google UserInfo endpoint
      if (accessToken) {
        try {
          const googleUserRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (googleUserRes.data && googleUserRes.data.email) {
            verifiedEmail = googleUserRes.data.email;
            verifiedName = googleUserRes.data.name;
            verifiedPicture = googleUserRes.data.picture;
            verifiedGoogleId = googleUserRes.data.sub;
          }
        } catch (err: any) {
          console.warn('Google token verification failed, falling back to body payload:', err.message);
        }
      }

      if (!verifiedEmail) {
        res.status(400).json({ error: 'Valid Google email is required.' });
        return;
      }

      const user = await prisma.user.upsert({
        where: { email: verifiedEmail },
        update: {
          name: verifiedName || undefined,
          picture: verifiedPicture || undefined,
          googleId: verifiedGoogleId || undefined,
        },
        create: {
          email: verifiedEmail,
          name: verifiedName || 'User',
          picture: verifiedPicture || null,
          googleId: verifiedGoogleId || null,
        },
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
      });
    } catch (error: any) {
      console.error('Auth error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/auth/me
   */
  public static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const email = req.query.email as string;
      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default AuthController;
