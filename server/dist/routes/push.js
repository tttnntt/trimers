"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushRouter = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const init_js_1 = require("../db/init.js");
const auth_js_1 = require("../middleware/auth.js");
exports.pushRouter = (0, express_1.Router)();
exports.pushRouter.use(auth_js_1.authMiddleware);
exports.pushRouter.post('/subscribe', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { endpoint, keys } = req.body;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ error: 'Invalid subscription' });
        }
        const db = (0, init_js_1.getDb)();
        const id = (0, crypto_1.randomUUID)();
        await db.run(`INSERT OR REPLACE INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?, ?)`, [id, userId, endpoint, keys.p256dh, keys.auth]);
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ error: 'Subscribe failed' });
    }
});
