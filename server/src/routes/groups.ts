import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { getDb } from '../db/init.js';
import { authMiddleware } from '../middleware/auth.js';
import { compressAndUpload } from '../storage/image-compress.js';
import { getSignedDownloadUrl } from '../storage/s3.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const groupsRouter = Router();

groupsRouter.use(authMiddleware);

async function ensureMember(db: any, groupId: string, userId: string) {
  const m = await db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  if (!m) throw new Error('Not a member');
}

groupsRouter.post('/', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });

    const id = randomUUID();
    const db = getDb();
    await db.run('INSERT INTO groups (id, name, creator_id) VALUES (?, ?, ?)', [id, name.trim(), userId]);
    await db.run('INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)', [randomUUID(), id, userId]);

    const group = await db.get('SELECT * FROM groups WHERE id = ?', [id]);
    const creator = await db.get('SELECT id, username, profile_picture, bio FROM users WHERE id = ?', [userId]);
    return res.json({
      ...group,
      members: [{ user: creator }],
      isCreator: true,
      profile_picture_url: null
    });
  } catch (e) {
    return res.status(500).json({ error: 'Create failed' });
  }
});

groupsRouter.get('/', async (req, res) => {
  const userId = (req as any).user.userId;
  const db = getDb();

  const groups = await db.all(
    `SELECT g.*, gm.user_id as member_user_id FROM groups g
     JOIN group_members gm ON g.id = gm.group_id
     WHERE gm.user_id = ?`,
    [userId]
  );

  const withDetails = await Promise.all(
    groups.map(async (g: any) => {
      const members = await db.all(
        `SELECT u.id, u.username, u.profile_picture, u.bio FROM users u
         JOIN group_members gm ON u.id = gm.user_id WHERE gm.group_id = ?`,
        [g.id]
      );
      const profileUrl = g.profile_picture ? await getSignedDownloadUrl(g.profile_picture) : null;
      return {
        ...g,
        members: members.map((m: any) => ({ user: m })),
        isCreator: g.creator_id === userId,
        profile_picture_url: profileUrl
      };
    })
  );

  return res.json(withDetails);
});

groupsRouter.get('/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = (req as any).user.userId;
    const db = getDb();

    await ensureMember(db, groupId, userId);

    const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
    const members = await db.all(
      `SELECT u.id, u.username, u.profile_picture, u.bio FROM users u
       JOIN group_members gm ON u.id = gm.user_id WHERE gm.group_id = ?`,
      [groupId]
    );

    const rounds = await db.all(
      `SELECT ar.*, u.username as starter_username FROM album_rounds ar
       JOIN users u ON ar.starter_user_id = u.id
       WHERE ar.group_id = ? ORDER BY ar.started_at DESC LIMIT 50`,
      [groupId]
    );

    const profileUrl = group.profile_picture ? await getSignedDownloadUrl(group.profile_picture) : null;

    return res.json({
      ...group,
      profile_picture_url: profileUrl,
      members: members.map((m: any) => ({ user: m })),
      rounds,
      isCreator: group.creator_id === userId
    });
  } catch (e: any) {
    if (e.message === 'Not a member') return res.status(403).json({ error: 'Not a member of this group' });
    return res.status(500).json({ error: 'Failed' });
  }
});

groupsRouter.post('/:id/members', async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = (req as any).user.userId;
    const { user_id: newUserId } = req.body;

    if (!newUserId) return res.status(400).json({ error: 'user_id required' });

    const db = getDb();
    await ensureMember(db, groupId, userId);

    const existing = await db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, newUserId]);
    if (existing) return res.status(409).json({ error: 'Already a member' });

    await db.run('INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)', [randomUUID(), groupId, newUserId]);

    const member = await db.get('SELECT id, username, profile_picture, bio FROM users WHERE id = ?', [newUserId]);
    return res.json({ added: member });
  } catch (e: any) {
    if (e.message === 'Not a member') return res.status(403).json({ error: 'Not a member' });
    return res.status(500).json({ error: 'Failed' });
  }
});

groupsRouter.post('/:id/picture', upload.single('file'), async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = (req as any).user.userId;
    const file = req.file;
    if (!file || !file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'Image required' });

    const db = getDb();
    await ensureMember(db, groupId, userId);

    const key = await compressAndUpload(file.buffer, file.mimetype);
    await db.run('UPDATE groups SET profile_picture = ? WHERE id = ?', [key, groupId]);
    const url = await getSignedDownloadUrl(key);
    return res.json({ profile_picture: key, url });
  } catch (e: any) {
    if (e.message === 'Not a member') return res.status(403).json({ error: 'Not a member' });
    return res.status(500).json({ error: 'Upload failed' });
  }
});
