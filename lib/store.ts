import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync, StatementSync } from "node:sqlite";

// Storage: one SQLite file (Node's built-in driver, no extra service) holding
// JSON documents. Every document belongs to an owner: a person's id, or
// "_system" for accounts and counters. The owner always comes from the signed
// cookie, never from the request body.
const DIR = path.resolve(/*turbopackIgnore: true*/ process.env.WAKESET_DATA_DIR || ".data");

type Statements = Record<"get" | "put" | "del" | "purge" | "bump", StatementSync>;
const g = globalThis as unknown as { __wakesetDb?: Statements };

function sql(): Statements {
  if (g.__wakesetDb) return g.__wakesetDb;
  const { DatabaseSync: Database } = process.getBuiltinModule("node:sqlite") as { DatabaseSync: typeof DatabaseSync };
  fs.mkdirSync(DIR, { recursive: true });
  const db = new Database(path.join(DIR, "wakeset.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS docs (owner TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (owner, key));
  `);
  return (g.__wakesetDb = {
    get: db.prepare("SELECT value FROM docs WHERE owner = ? AND key = ?"),
    put: db.prepare("INSERT INTO docs VALUES (?, ?, ?, ?) ON CONFLICT (owner, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"),
    del: db.prepare("DELETE FROM docs WHERE owner = ? AND key = ?"),
    purge: db.prepare("DELETE FROM docs WHERE owner = ?"),
    // Adds one to a counter and returns the new value in a single statement, so two requests cannot both read the old one.
    bump: db.prepare("INSERT INTO docs VALUES (?, ?, '1', ?) ON CONFLICT (owner, key) DO UPDATE SET value = CAST(value AS INTEGER) + 1, updated_at = excluded.updated_at RETURNING value"),
  });
}

const now = () => new Date().toISOString();
export const SYSTEM = "_system";

export function read<T>(owner: string, key: string, fallback: T): T {
  const row = sql().get.get(owner, key) as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as T) : fallback;
}
export function write(owner: string, key: string, value: unknown) {
  sql().put.run(owner, key, JSON.stringify(value), now());
}
export function remove(owner: string, key: string) {
  sql().del.run(owner, key);
}
/** Deletes everything one person has stored. */
export function purge(owner: string) {
  if (!owner || owner === SYSTEM) throw new Error("That cannot be wiped.");
  sql().purge.run(owner);
}
export function bump(owner: string, key: string): number {
  return Number((sql().bump.get(owner, key, now()) as { value: string | number }).value);
}
