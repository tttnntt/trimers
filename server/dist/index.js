"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_js_1 = require("./routes/auth.js");
const users_js_1 = require("./routes/users.js");
const groups_js_1 = require("./routes/groups.js");
const albums_js_1 = require("./routes/albums.js");
const push_js_1 = require("./routes/push.js");
const init_js_1 = require("./db/init.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
}));
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many requests' }
}));
app.use('/api', (req, res, next) => {
    if (req.path === '/health')
        return next();
    if (!dbReady)
        return res.status(503).json({ error: 'Server initializing, try again in a moment' });
    next();
});
app.use('/api/auth', auth_js_1.authRouter);
app.use('/api/users', users_js_1.usersRouter);
app.use('/api/groups', groups_js_1.groupsRouter);
app.use('/api/albums', albums_js_1.albumsRouter);
app.use('/api/push', push_js_1.pushRouter);
let dbReady = false;
app.get('/api/health', (_, res) => {
    if (dbReady)
        return res.json({ ok: true });
    res.status(503).json({ ok: false, status: 'initializing' });
});
app.listen(PORT, () => {
    console.log(`Trimers API listening on port ${PORT}`);
    (0, init_js_1.initDb)()
        .then(() => {
        dbReady = true;
        console.log('Database ready');
    })
        .catch(err => {
        console.error('Failed to init DB:', err);
    });
});
