import Database from 'better-sqlite3';
import path from 'path';
import type { Top8Entry } from './types';
import type { Installation, InstallationQuery } from '@slack/bolt';

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'top8.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS top8 (
    team_id   TEXT    NOT NULL DEFAULT '',
    user_id   TEXT    NOT NULL,
    position  INTEGER NOT NULL CHECK (position BETWEEN 1 AND 8),
    friend_id TEXT    NOT NULL,
    PRIMARY KEY (team_id, user_id, position)
  );
  CREATE TABLE IF NOT EXISTS installations (
    team_id TEXT PRIMARY KEY,
    data    TEXT NOT NULL
  )
`);

// Migrate existing top8 rows that lack team_id
try { db.exec('ALTER TABLE top8 ADD COLUMN team_id TEXT NOT NULL DEFAULT ""'); } catch {}

const stmtGet = db.prepare<[string, string], Top8Entry>(
  'SELECT position, friend_id FROM top8 WHERE team_id = ? AND user_id = ? ORDER BY position'
);
const stmtDelete = db.prepare<[string, string]>(
  'DELETE FROM top8 WHERE team_id = ? AND user_id = ?'
);
const stmtInsert = db.prepare<[string, string, number, string]>(
  'INSERT INTO top8 (team_id, user_id, position, friend_id) VALUES (?, ?, ?, ?)'
);
const stmtStoreInstallation = db.prepare<[string, string]>(
  'INSERT OR REPLACE INTO installations (team_id, data) VALUES (?, ?)'
);
const stmtFetchInstallation = db.prepare<[string], { data: string }>(
  'SELECT data FROM installations WHERE team_id = ?'
);
const stmtDeleteInstallation = db.prepare<[string]>(
  'DELETE FROM installations WHERE team_id = ?'
);

export function getTop8(teamId: string, userId: string): Top8Entry[] {
  return stmtGet.all(teamId, userId);
}

export const setTop8 = db.transaction((teamId: string, userId: string, friendIds: string[]) => {
  stmtDelete.run(teamId, userId);
  friendIds.forEach((friendId, i) => {
    stmtInsert.run(teamId, userId, i + 1, friendId);
  });
});

export function storeInstallation(installation: Installation): void {
  const teamId = installation.isEnterpriseInstall
    ? installation.enterprise?.id ?? ''
    : installation.team?.id ?? '';
  stmtStoreInstallation.run(teamId, JSON.stringify(installation));
}

export function fetchInstallation(query: InstallationQuery<boolean>): Installation {
  const teamId = query.isEnterpriseInstall ? query.enterpriseId ?? '' : query.teamId ?? '';
  const row = stmtFetchInstallation.get(teamId);
  if (!row) throw new Error(`No installation found for team ${teamId}`);
  return JSON.parse(row.data) as Installation;
}

export function deleteInstallation(query: InstallationQuery<boolean>): void {
  const teamId = query.isEnterpriseInstall ? query.enterpriseId ?? '' : query.teamId ?? '';
  stmtDeleteInstallation.run(teamId);
}
