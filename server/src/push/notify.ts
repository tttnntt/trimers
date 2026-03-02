import webpush from 'web-push';
import { getDb } from '../db/init.js';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:support@trimers.app', VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function sendPushToUser(userId: string, payload: { title?: string; body?: string }) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  try {
    const db = getDb();
    const sub = await db.get('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?', [userId]);
    if (!sub) return;

    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      },
      JSON.stringify(payload),
      { TTL: 3600 }
    );
  } catch (e) {
    console.error('Push failed:', e);
  }
}

export async function sendPushToGroup(groupId: string, body: string) {
  try {
    const db = getDb();
    const members = await db.all(
      'SELECT user_id FROM group_members WHERE group_id = ?',
      [groupId]
    );
    for (const m of members) {
      await sendPushToUser(m.user_id, { title: 'Trimers', body });
    }
  } catch (e) {
    console.error('Group push failed:', e);
  }
}
