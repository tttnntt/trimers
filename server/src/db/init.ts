import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Awaited<ReturnType<typeof open>>;

export async function initDb() {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'trimers.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT,
      profile_picture TEXT,
      bio TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      profile_picture TEXT,
      creator_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE(group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS album_rounds (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      starter_user_id TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (starter_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (round_id) REFERENCES album_rounds(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(round_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS album_photos (
      id TEXT PRIMARY KEY,
      album_id TEXT NOT NULL,
      object_key TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (album_id) REFERENCES albums(id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      album_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      stars INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE(album_id, user_id),
      FOREIGN KEY (album_id) REFERENCES albums(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE(user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_albums_round ON albums(round_id);
    CREATE INDEX IF NOT EXISTS idx_album_rounds_group ON album_rounds(group_id);
  `);

  return db;
}

export function getDb() {
  if (!db) throw new Error('DB not initialized');
  return db;
}
