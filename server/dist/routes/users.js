"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const init_js_1 = require("../db/init.js");
const auth_js_1 = require("../middleware/auth.js");
const image_compress_js_1 = require("../storage/image-compress.js");
const s3_js_1 = require("../storage/s3.js");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use(auth_js_1.authMiddleware);
exports.usersRouter.get('/avatar', async (req, res) => {
    try {
        const userId = req.user.userId;
        const db = (0, init_js_1.getDb)();
        const u = await db.get('SELECT profile_picture FROM users WHERE id = ?', [userId]);
        if (!u?.profile_picture)
            return res.status(404).json({ error: 'No avatar' });
        const url = await (0, s3_js_1.getSignedDownloadUrl)(u.profile_picture);
        return res.redirect(url);
    }
    catch {
        return res.status(404).json({ error: 'No avatar' });
    }
});
exports.usersRouter.patch('/profile', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { username, bio } = req.body;
        if (bio && bio.split(/\s+/).length > 1) {
            return res.status(400).json({ error: 'Bio must be one word' });
        }
        const db = (0, init_js_1.getDb)();
        await db.run('UPDATE users SET username = COALESCE(?, username), bio = COALESCE(?, bio) WHERE id = ?', [username ?? null, bio ?? null, userId]);
        const user = await db.get('SELECT id, email, username, profile_picture, bio FROM users WHERE id = ?', [userId]);
        return res.json(user);
    }
    catch (e) {
        return res.status(500).json({ error: 'Update failed' });
    }
});
exports.usersRouter.post('/profile/picture', upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const file = req.file;
        if (!file || !file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Image file required' });
        }
        const key = await (0, image_compress_js_1.compressAndUpload)(file.buffer, file.mimetype);
        const db = (0, init_js_1.getDb)();
        await db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [key, userId]);
        const url = await (0, s3_js_1.getSignedDownloadUrl)(key);
        return res.json({ profile_picture: key, url });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Upload failed' });
    }
});
exports.usersRouter.get('/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2)
        return res.json([]);
    const db = (0, init_js_1.getDb)();
    const rows = await db.all(`SELECT id, username, profile_picture, bio FROM users
     WHERE (username LIKE ? OR email LIKE ?) AND id != ?
     LIMIT 20`, [`%${q}%`, `%${q}%`, req.user.userId]);
    const withUrls = await Promise.all(rows.map(async (r) => ({
        ...r,
        profile_picture_url: r.profile_picture ? await (0, s3_js_1.getSignedDownloadUrl)(r.profile_picture) : null
    })));
    return res.json(withUrls);
});
