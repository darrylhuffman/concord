import { v4 as uuid } from "uuid";
import { getDb } from "../db/database.js";
import type { Role } from "@concord/protocol";
import { isAdmin } from "../config.js";

export function getAllRoles(): Role[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, name, permissions, sort_order FROM roles ORDER BY sort_order ASC")
    .all() as { id: string; name: string; permissions: number; sort_order: number }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    permissions: r.permissions,
    sortOrder: r.sort_order,
  }));
}

export function createRole(name: string, permissions: number): Role {
  const db = getDb();
  const id = uuid();
  const maxOrder = (
    db.prepare("SELECT MAX(sort_order) as m FROM roles").get() as { m: number | null }
  ).m ?? -1;
  const sortOrder = maxOrder + 1;
  const now = Date.now();
  db.prepare(
    "INSERT INTO roles (id, name, permissions, sort_order, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, permissions, sortOrder, now);
  return { id, name, permissions, sortOrder };
}

export function updateRole(
  roleId: string,
  update: { name?: string; permissions?: number; sortOrder?: number }
): Role | null {
  const db = getDb();
  const existing = db.prepare("SELECT id, name, permissions, sort_order FROM roles WHERE id = ?").get(roleId) as
    | { id: string; name: string; permissions: number; sort_order: number }
    | undefined;
  if (!existing) return null;

  const name = update.name ?? existing.name;
  const permissions = update.permissions ?? existing.permissions;
  const sortOrder = update.sortOrder ?? existing.sort_order;

  db.prepare("UPDATE roles SET name = ?, permissions = ?, sort_order = ? WHERE id = ?").run(
    name,
    permissions,
    sortOrder,
    roleId
  );

  return { id: roleId, name, permissions, sortOrder };
}

export function deleteRole(roleId: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM roles WHERE id = ?").run(roleId);
  return result.changes > 0;
}

export function reorderRoles(order: string[]): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE roles SET sort_order = ? WHERE id = ?");
  const tx = db.transaction(() => {
    for (let i = 0; i < order.length; i++) {
      stmt.run(i, order[i]);
    }
  });
  tx();
}

export function assignRole(publicKey: string, roleId: string | null): void {
  const db = getDb();
  if (roleId === null) {
    db.prepare("DELETE FROM role_assignments WHERE public_key = ?").run(publicKey);
  } else {
    db.prepare(
      "INSERT INTO role_assignments (public_key, role_id, assigned_at) VALUES (?, ?, ?) ON CONFLICT(public_key) DO UPDATE SET role_id = excluded.role_id, assigned_at = excluded.assigned_at"
    ).run(publicKey, roleId, Date.now());
  }
}

export function getUserRole(publicKey: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT role_id FROM role_assignments WHERE public_key = ?")
    .get(publicKey) as { role_id: string } | undefined;
  return row?.role_id ?? null;
}

export function getAllRoleAssignments(): Record<string, string> {
  const db = getDb();
  const rows = db
    .prepare("SELECT public_key, role_id FROM role_assignments")
    .all() as { public_key: string; role_id: string }[];
  const result: Record<string, string> = {};
  for (const r of rows) result[r.public_key] = r.role_id;
  return result;
}

export function getUserPermissions(publicKey: string): number {
  if (isAdmin(publicKey)) return 0xffffffff;
  const roleId = getUserRole(publicKey);
  if (!roleId) return 0;
  const db = getDb();
  const row = db
    .prepare("SELECT permissions FROM roles WHERE id = ?")
    .get(roleId) as { permissions: number } | undefined;
  return row?.permissions ?? 0;
}
