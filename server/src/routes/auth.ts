import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getDb } from '../db/init.js';
import { authMiddleware, createToken } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Email and password (min 8 chars) required' });
    }

    const db = getDb();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = randomUUID();
    const password_hash = await bcrypt.hash(password, 12);

    await db.run(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [id, email.toLowerCase(), password_hash]
    );

    const token = createToken({ userId: id, email: email.toLowerCase() });
    return res.json({ token, userId: id, needsProfile: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const db = getDb();
    const user = await db.get('SELECT id, email, password_hash, username FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createToken({ userId: user.id, email: user.email });
    const needsProfile = !user.username;
    return res.json({ token, userId: user.id, needsProfile });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get(
      'SELECT id, email, username, profile_picture, bio FROM users WHERE id = ?',
      [(req as any).user.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});
