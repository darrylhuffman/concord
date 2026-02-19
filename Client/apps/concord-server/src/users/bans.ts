import { getDb } from "../db/database.js";

export function banUser(publicKey: string, bannedBy: string, reason?: string): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO banned_users (public_key, banned_by, reason, banned_at) VALUES (?, ?, ?, ?) ON CONFLICT(public_key) DO UPDATE SET banned_by = excluded.banned_by, reason = excluded.reason, banned_at = excluded.banned_at"
  ).run(publicKey, bannedBy, reason ?? null, Date.now());
}

export function unbanUser(publicKey: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM banned_users WHERE public_key = ?").run(publicKey);
  return result.changes > 0;
}

export function isBanned(publicKey: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM banned_users WHERE public_key = ?")
    .get(publicKey);
  return !!row;
}
