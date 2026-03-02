"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.albumsRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
const init_js_1 = require("../db/init.js");
const auth_js_1 = require("../middleware/auth.js");
const image_compress_js_1 = require("../storage/image-compress.js");
const s3_js_1 = require("../storage/s3.js");
const notify_js_1 = require("../push/notify.js");
const HOURS_48 = 48 * 60 * 60 * 1000;
const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
exports.albumsRouter = (0, express_1.Router)();
exports.albumsRouter.use(auth_js_1.authMiddleware);
async function ensureMember(db, groupId, userId) {
    const m = await db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    if (!m)
        throw new Error('Not a member');
}
exports.albumsRouter.post('/rounds', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { group_id: groupId } = req.body;
        if (!groupId)
            return res.status(400).json({ error: 'group_id required' });
        const db = (0, init_js_1.getDb)();
        await ensureMember(db, groupId, userId);
        const roundId = (0, crypto_1.randomUUID)();
        const now = Date.now();
        const endsAt = now + HOURS_48;
        await db.run('INSERT INTO album_rounds (id, group_id, started_at, ends_at, starter_user_id) VALUES (?, ?, ?, ?, ?)', [roundId, groupId, now, endsAt, userId]);
        await (0, notify_js_1.sendPushToGroup)(groupId, 'New album round started! You have 48 hours to submit your album.');
        const round = await db.get('SELECT * FROM album_rounds WHERE id = ?', [roundId]);
        return res.json(round);
    }
    catch (e) {
        if (e.message === 'Not a member')
            return res.status(403).json({ error: 'Not a member' });
        return res.status(500).json({ error: 'Failed' });
    }
});
exports.albumsRouter.post('/upload', upload.array('photos', MAX_PHOTOS), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { round_id: roundId } = req.body;
        const files = req.files || [];
        if (!roundId || files.length < MIN_PHOTOS || files.length > MAX_PHOTOS) {
            return res.status(400).json({
                error: `Album must have between ${MIN_PHOTOS} and ${MAX_PHOTOS} photos`
            });
        }
        const db = (0, init_js_1.getDb)();
        const round = await db.get('SELECT * FROM album_rounds WHERE id = ?', [roundId]);
        if (!round)
            return res.status(404).json({ error: 'Round not found' });
        if (Date.now() > round.ends_at) {
            return res.status(400).json({ error: 'Round has ended' });
        }
        await ensureMember(db, round.group_id, userId);
        const existing = await db.get('SELECT id FROM albums WHERE round_id = ? AND user_id = ?', [roundId, userId]);
        if (existing)
            return res.status(409).json({ error: 'Already submitted for this round' });
        const albumId = (0, crypto_1.randomUUID)();
        await db.run('INSERT INTO albums (id, round_id, user_id) VALUES (?, ?, ?)', [albumId, roundId, userId]);
        const keys = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (!f.mimetype.startsWith('image/'))
                continue;
            const key = await (0, image_compress_js_1.compressAndUpload)(f.buffer, f.mimetype);
            keys.push(key);
            await db.run('INSERT INTO album_photos (id, album_id, object_key, order_index) VALUES (?, ?, ?, ?)', [(0, crypto_1.randomUUID)(), albumId, key, i]);
        }
        if (keys.length < MIN_PHOTOS) {
            await db.run('DELETE FROM albums WHERE id = ?', [albumId]);
            return res.status(400).json({ error: `Need at least ${MIN_PHOTOS} valid images` });
        }
        const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', [round.group_id]);
        await (0, notify_js_1.sendPushToGroup)(round.group_id, 'Someone submitted their album! Submit yours before the 48h countdown ends.');
        const album = await db.get('SELECT * FROM albums WHERE id = ?', [albumId]);
        return res.json(album);
    }
    catch (e) {
        if (e.message === 'Not a member')
            return res.status(403).json({ error: 'Not a member' });
        console.error(e);
        return res.status(500).json({ error: 'Upload failed' });
    }
});
exports.albumsRouter.get('/rounds/:roundId', async (req, res) => {
    try {
        const roundId = req.params.roundId;
        const userId = req.user.userId;
        const db = (0, init_js_1.getDb)();
        const round = await db.get('SELECT * FROM album_rounds WHERE id = ?', [roundId]);
        if (!round)
            return res.status(404).json({ error: 'Round not found' });
        await ensureMember(db, round.group_id, userId);
        const albums = await db.all(`SELECT a.*, u.username, u.profile_picture FROM albums a
       JOIN users u ON a.user_id = u.id WHERE a.round_id = ?`, [roundId]);
        const withPhotos = await Promise.all(albums.map(async (a) => {
            const photos = await db.all('SELECT id, object_key, order_index FROM album_photos WHERE album_id = ? ORDER BY order_index', [a.id]);
            const urls = await Promise.all(photos.map((p) => (0, s3_js_1.getSignedDownloadUrl)(p.object_key)));
            const voteCount = await db.get('SELECT COALESCE(SUM(stars), 0) as total FROM votes WHERE album_id = ?', [a.id]);
            const userVote = await db.get('SELECT stars FROM votes WHERE album_id = ? AND user_id = ?', [a.id, userId]);
            return {
                ...a,
                photos: photos.map((p, i) => ({ ...p, url: urls[i] })),
                star_count: voteCount?.total || 0,
                user_vote: userVote?.stars ?? null
            };
        }));
        return res.json({
            ...round,
            albums: withPhotos,
            time_remaining_ms: Math.max(0, round.ends_at - Date.now())
        });
    }
    catch (e) {
        if (e.message === 'Not a member')
            return res.status(403).json({ error: 'Not a member' });
        return res.status(500).json({ error: 'Failed' });
    }
});
exports.albumsRouter.get('/group/:groupId/bio', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user.userId;
        const db = (0, init_js_1.getDb)();
        await ensureMember(db, groupId, userId);
        const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
        const rounds = await db.all('SELECT * FROM album_rounds WHERE group_id = ? ORDER BY started_at DESC', [groupId]);
        const roundsWithAlbums = await Promise.all(rounds.map(async (r) => {
            const albums = await db.all(`SELECT a.*, u.username FROM albums a JOIN users u ON a.user_id = u.id WHERE a.round_id = ?`, [r.id]);
            const withThumbs = await Promise.all(albums.map(async (a) => {
                const first = await db.get('SELECT object_key FROM album_photos WHERE album_id = ? ORDER BY order_index LIMIT 1', [a.id]);
                const url = first ? await (0, s3_js_1.getSignedDownloadUrl)(first.object_key) : null;
                const voteCount = await db.get('SELECT COALESCE(SUM(stars), 0) as total FROM votes WHERE album_id = ?', [a.id]);
                return { ...a, thumbnail_url: url, star_count: voteCount?.total || 0 };
            }));
            return { ...r, albums: withThumbs };
        }));
        const profileUrl = group.profile_picture ? await (0, s3_js_1.getSignedDownloadUrl)(group.profile_picture) : null;
        return res.json({
            group: { ...group, profile_picture_url: profileUrl },
            rounds: roundsWithAlbums
        });
    }
    catch (e) {
        if (e.message === 'Not a member')
            return res.status(403).json({ error: 'Not a member' });
        return res.status(500).json({ error: 'Failed' });
    }
});
exports.albumsRouter.post('/:albumId/vote', async (req, res) => {
    try {
        const albumId = req.params.albumId;
        const userId = req.user.userId;
        const { stars } = req.body;
        const starCount = Math.min(5, Math.max(1, parseInt(String(stars || 1), 10) || 1));
        const db = (0, init_js_1.getDb)();
        const album = await db.get('SELECT * FROM albums WHERE id = ?', [albumId]);
        if (!album)
            return res.status(404).json({ error: 'Album not found' });
        const round = await db.get('SELECT * FROM album_rounds WHERE id = ?', [album.round_id]);
        await ensureMember(db, round.group_id, userId);
        const id = (0, crypto_1.randomUUID)();
        await db.run('INSERT OR REPLACE INTO votes (id, album_id, user_id, stars) VALUES (?, ?, ?, ?)', [id, albumId, userId, starCount]);
        const total = await db.get('SELECT SUM(stars) as t FROM votes WHERE album_id = ?', [albumId]);
        return res.json({ star_count: total?.t || 0, user_vote: starCount });
    }
    catch (e) {
        if (e.message === 'Not a member')
            return res.status(403).json({ error: 'Not a member' });
        return res.status(500).json({ error: 'Failed' });
    }
});
