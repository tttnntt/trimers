import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { getDb } from '../db/init.js';
import { authMiddleware } from '../middleware/auth.js';
import { compressAndUpload } from '../storage/image-compress.js';
import { getSignedDownloadUrl } from '../storage/s3.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const usersRouter = Router();

usersRouter.use(authMiddleware);

usersRouter.get('/avatar', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const db = getDb();
    const u = await db.get('SELECT profile_picture FROM users WHERE id = ?', [userId]);
    if (!u?.profile_picture) return res.status(404).json({ error: 'No avatar' });
    const url = await getSignedDownloadUrl(u.profile_picture);
    return res.redirect(url);
  } catch {
    return res.status(404).json({ error: 'No avatar' });
  }
});

usersRouter.patch('/profile', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { username, bio } = req.body;

    if (bio && bio.split(/\s+/).length > 1) {
      return res.status(400).json({ error: 'Bio must be one word' });
    }

    const db = getDb();
    await db.run(
      'UPDATE users SET username = COALESCE(?, username), bio = COALESCE(?, bio) WHERE id = ?',
      [username ?? null, bio ?? null, userId]
    );
    const user = await db.get('SELECT id, email, username, profile_picture, bio FROM users WHERE id = ?', [userId]);
    return res.json(user);
  } catch (e) {
    return res.status(500).json({ error: 'Update failed' });
  }
});

usersRouter.post('/profile/picture', upload.single('file'), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const file = req.file;
    if (!file || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Image file required' });
    }

    const key = await compressAndUpload(file.buffer, file.mimetype);
    const db = getDb();
    await db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [key, userId]);
    const url = await getSignedDownloadUrl(key);
    return res.json({ profile_picture: key, url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

usersRouter.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);

  const db = getDb();
  const rows = await db.all(
    `SELECT id, username, profile_picture, bio FROM users
     WHERE (username LIKE ? OR email LIKE ?) AND id != ?
     LIMIT 20`,
    [`%${q}%`, `%${q}%`, (req as any).user.userId]
  );

  const withUrls = await Promise.all(
    rows.map(async (r: any) => ({
      ...r,
      profile_picture_url: r.profile_picture ? await getSignedDownloadUrl(r.profile_picture) : null
    }))
  );

  return res.json(withUrls);
});
