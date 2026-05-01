import Database from 'better-sqlite3';
import path from 'path';
import type { Top8Entry } from './types';

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'top8.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS top8 (
    user_id   TEXT    NOT NULL,
    position  INTEGER NOT NULL CHECK (position BETWEEN 1 AND 8),
    friend_id TEXT    NOT NULL,
    PRIMARY KEY (user_id, position)
  );
  CREATE TABLE IF NOT EXISTS user_tokens (
    user_id      TEXT PRIMARY KEY,
    access_token TEXT NOT NULL
  )
`);

const stmtGet = db.prepare<[string], Top8Entry>(
  'SELECT position, friend_id FROM top8 WHERE user_id = ? ORDER BY position'
);

const stmtDelete = db.prepare<[string]>('DELETE FROM top8 WHERE user_id = ?');

const stmtInsert = db.prepare<[string, number, string]>(
  'INSERT INTO top8 (user_id, position, friend_id) VALUES (?, ?, ?)'
);

const stmtGetToken = db.prepare<[string], { access_token: string }>(
  'SELECT access_token FROM user_tokens WHERE user_id = ?'
);
const stmtSetToken = db.prepare<[string, string]>(
  'INSERT OR REPLACE INTO user_tokens (user_id, access_token) VALUES (?, ?)'
);

export function getTop8(userId: string): Top8Entry[] {
  return stmtGet.all(userId);
}

export function getUserToken(userId: string): string | null {
  return stmtGetToken.get(userId)?.access_token ?? null;
}

export function setUserToken(userId: string, token: string): void {
  stmtSetToken.run(userId, token);
}

export const setTop8 = db.transaction((userId: string, friendIds: string[]) => {
  stmtDelete.run(userId);
  friendIds.forEach((friendId, i) => {
    stmtInsert.run(userId, i + 1, friendId);
  });
});
