"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const init_js_1 = require("../db/init.js");
const auth_js_1 = require("../middleware/auth.js");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password || password.length < 8) {
            return res.status(400).json({ error: 'Email and password (min 8 chars) required' });
        }
        const db = (0, init_js_1.getDb)();
        const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        const id = (0, crypto_1.randomUUID)();
        const password_hash = await bcryptjs_1.default.hash(password, 12);
        await db.run('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [id, email.toLowerCase(), password_hash]);
        const token = (0, auth_js_1.createToken)({ userId: id, email: email.toLowerCase() });
        return res.json({ token, userId: id, needsProfile: true });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Registration failed' });
    }
});
exports.authRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const db = (0, init_js_1.getDb)();
        const user = await db.get('SELECT id, email, password_hash, username FROM users WHERE email = ?', [email.toLowerCase()]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const ok = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!ok) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = (0, auth_js_1.createToken)({ userId: user.id, email: user.email });
        const needsProfile = !user.username;
        return res.json({ token, userId: user.id, needsProfile });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Login failed' });
    }
});
exports.authRouter.get('/me', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const db = (0, init_js_1.getDb)();
        const user = await db.get('SELECT id, email, username, profile_picture, bio FROM users WHERE id = ?', [req.user.userId]);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        return res.json(user);
    }
    catch (e) {
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
});
