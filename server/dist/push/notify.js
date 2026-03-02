"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushToUser = sendPushToUser;
exports.sendPushToGroup = sendPushToGroup;
const web_push_1 = __importDefault(require("web-push"));
const init_js_1 = require("../db/init.js");
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
    web_push_1.default.setVapidDetails('mailto:support@trimers.app', VAPID_PUBLIC, VAPID_PRIVATE);
}
async function sendPushToUser(userId, payload) {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE)
        return;
    try {
        const db = (0, init_js_1.getDb)();
        const sub = await db.get('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?', [userId]);
        if (!sub)
            return;
        await web_push_1.default.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, JSON.stringify(payload), { TTL: 3600 });
    }
    catch (e) {
        console.error('Push failed:', e);
    }
}
async function sendPushToGroup(groupId, body) {
    try {
        const db = (0, init_js_1.getDb)();
        const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', [groupId]);
        for (const m of members) {
            await sendPushToUser(m.user_id, { title: 'Trimers', body });
        }
    }
    catch (e) {
        console.error('Group push failed:', e);
    }
}
