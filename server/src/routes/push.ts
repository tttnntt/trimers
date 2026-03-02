import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/init.js';
import { authMiddleware } from '../middleware/auth.js';

export const pushRouter = Router();

pushRouter.use(authMiddleware);

pushRouter.post('/subscribe', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    const db = getDb();
    const id = randomUUID();
    await db.run(
      `INSERT OR REPLACE INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, endpoint, keys.p256dh, keys.auth]
    );
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Subscribe failed' });
  }
});
