"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupsRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
const init_js_1 = require("../db/init.js");
const auth_js_1 = require("../middleware/auth.js");
const image_compress_js_1 = require("../storage/image-compress.js");
const s3_js_1 = require("../storage/s3.js");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
exports.groupsRouter = (0, express_1.Router)();
exports.groupsRouter.use(auth_js_1.authMiddleware);
async function ensureMember(db, groupId, userId) {
    const m = await db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    if (!m)
        throw new Error('Not a member');
}
exports.groupsRouter.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name } = req.body;
        if (!name?.trim())
            return res.status(400).json({ error: 'Group name required' });
        const id = (0, crypto_1.randomUUID)();
        const db = (0, init_js_1.getDb)();
        await db.run('INSERT INTO groups (id, name, creator_id) VALUES (?, ?, ?)', [id, name.trim(), userId]);
        await db.run('INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)', [(0, crypto_1.randomUUID)(), id, userId]);
        const group = await db.get('SELECT * FROM groups WHERE id = ?', [id]);
        const creator = await db.get('SELECT id, username, profile_picture, bio FROM users WHERE id = ?', [userId]);
        return res.json({
            ...group,
            members: [{ user: creator }],
            isCreator: true,
            profile_picture_url: null
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Create failed' });
    }
});
exports.groupsRouter.get('/', async (req, res) => {
    const userId = req.user.userId;
    const db = (0, init_js_1.getDb)();
    const groups = await db.all(`SELECT g.*, gm.user_id as member_user_id FROM groups g
     JOIN group_members gm ON g.id = gm.group_id
     WHERE gm.user_id = ?`, [userId]);
    const withDetails = await Promise.all(groups.map(async (g) => {
        const members = await db.all(`SELECT u.id, u.username, u.profile_picture, u.bio FROM users u
         JOIN group_members gm ON u.id = gm.user_id WHERE gm.group_id = ?`, [g.id]);
        const profileUrl = g.profile_picture ? await (0, s3_js_1.getSignedDownloadUrl)(g.profile_picture) : null;
        return {
            ...g,
            members: members.map((m) => ({ user: m })),
            isCreator: g.creator_id === userId,
            profile_picture_url: profileUrl
        };
    }));
    return res.json(withDetails);
});
exports.groupsRouter.get('/:id', async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.userId;
        const db = (0, init_js_1.getDb)();
        await ensureMember(db, groupId, userId);
        const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
        const members = await db.all(`SELECT u.id, u.username, u.profile_picture, u.bio FROM users u
       JOIN group_members gm ON u.id = gm.user_id WHERE gm.group_id = ?`, [groupId]);
        const rounds = await db.all(`SELECT ar.*, u.username as starter_username FROM album_rounds ar
       JOIN users u ON ar.starter_user_id = u.id
       WHERE ar.group_id = ? ORDER BY ar.started_at DESC LIMIT 50`, [groupId]);
        const profileUrl = group.profile_picture ? await (0, s3_js_1.getSignedDownloadUrl)(group.profile_picture) : null;
        return res.json({
            ...group,
            profile_picture_url: profileUrl,
            members: members.map((m) => ({ user: m })),
            rounds,
            isCreator: group.creator_id === userId
        });
    }
    catch (e) {
        if (e.message === 'Not a member')
            return res.status(403).json({ error: 'Not a member of this group' });
        return res.status(500).json({ error: 'Failed' });
    }
});
exports.groupsRouter.post('/:id/members', async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.userId;
        const { user_id: newUserId } = req.body;
        if (!newUserId)
            return res.status(400).json({ error: 'user_id required' });
        const db = (0, init_js_1.getDb)();
        await ensureMember(db, groupId, userId);
        const existing = await db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, newUserId]);
        if (existing)
            return res.status(409).json({ error: 'Already a member' });
        await db.run('INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)', [(0, crypto_1.randomUUID)(), groupId, newUserId]);
        const member = await db.get('SELECT id, username, profile_picture, bio FROM users WHERE id = ?', [newUserId]);
        return res.json({ added: member });
    }
    catch (e) {
        if (e.message === 'Not a member')
            return res.status(403).json({ error: 'Not a member' });
        return res.status(500).json({ error: 'Failed' });
    }
});
exports.groupsRouter.post('/:id/picture', upload.single('file'), async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.userId;
        const file = req.file;
        if (!file || !file.mimetype.startsWith('image/'))
            return res.status(400).json({ error: 'Image required' });
        const db = (0, init_js_1.getDb)();
        await ensureMember(db, groupId, userId);
        const key = await (0, image_compress_js_1.compressAndUpload)(file.buffer, file.mimetype);
        await db.run('UPDATE groups SET profile_picture = ? WHERE id = ?', [key, groupId]);
        const url = await (0, s3_js_1.getSignedDownloadUrl)(key);
        return res.json({ profile_picture: key, url });
    }
    catch (e) {
        if (e.message === 'Not a member')
            return res.status(403).json({ error: 'Not a member' });
        return res.status(500).json({ error: 'Upload failed' });
    }
});
