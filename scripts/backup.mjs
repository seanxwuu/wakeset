// Makes, lists, checks and restores WakeSet database backups. Run on the
// server through deploy/backup.sh and deploy/restore.sh; it works on the
// folder in WAKESET_DATA_DIR (default .data).
//
//   node scripts/backup.mjs backup
//   node scripts/backup.mjs list
//   node scripts/backup.mjs verify  latest | <file name>
//   node scripts/backup.mjs restore latest | <file name>
//
// A restore first checks the backup reads back whole, then sets the current
// database aside as before-restore-<time>.db, so a restore can itself be undone.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA = path.resolve(process.env.WAKESET_DATA_DIR || ".data");
const BACKUPS = path.join(DATA, "backups");
const DB = path.join(DATA, "wakeset.db");
const KEEP = 14;
const [, , command = "list", target = ""] = process.argv;
const fail = (message) => { console.error(message); process.exit(1); };
const stamp = () => { const t = new Date().toISOString().replace(/[-:]/g, ""); return `${t.slice(0, 8)}-${t.slice(9, 15)}`; };
/** Nightly backups, newest first. Set-aside copies from restores are not counted. */
const nightly = () => (fs.existsSync(BACKUPS) ? fs.readdirSync(BACKUPS).filter((f) => /^wakeset-[\d-]+\.db$/.test(f)).sort().reverse() : []);

/** The file a name refers to. Only plain file names inside the backups folder are accepted. */
function resolve(name) {
  if (name === "latest") name = nightly()[0] ?? fail("There are no backups yet.");
  if (!/^[\w.-]+\.db$/.test(name)) fail("Give a backup's file name from the list, or `latest`.");
  const file = path.join(BACKUPS, name);
  if (!fs.existsSync(file)) fail(`There is no backup called ${name}.`);
  return file;
}

function verify(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const check = db.prepare("PRAGMA integrity_check").get()?.integrity_check;
    if (check !== "ok") fail(`That backup failed its integrity check (${check}). Nothing was changed.`);
    const documents = db.prepare("SELECT COUNT(*) AS n FROM docs").get().n;
    const people = db.prepare("SELECT COUNT(DISTINCT owner) AS n FROM docs WHERE owner != '_system'").get().n;
    return `${path.basename(file)} is intact: ${documents} documents, ${people} people.`;
  } finally {
    db.close();
  }
}

if (command === "backup") {
  if (!fs.existsSync(DB)) { console.log("No database yet, nothing to back up."); process.exit(0); }
  fs.mkdirSync(BACKUPS, { recursive: true });
  const file = path.join(BACKUPS, `wakeset-${stamp()}.db`);
  const db = new DatabaseSync(DB);
  db.exec(`VACUUM INTO '${file}'`);
  db.close();
  for (const old of nightly().slice(KEEP)) fs.rmSync(path.join(BACKUPS, old));
  console.log(`Backed up to ${file}`);
} else if (command === "list") {
  const files = nightly();
  console.log(files.length ? files.map((f) => `${f}  ${(fs.statSync(path.join(BACKUPS, f)).size / 1024).toFixed(0)} KB`).join("\n") : "There are no backups yet.");
} else if (command === "verify") {
  console.log(verify(resolve(target)));
} else if (command === "restore") {
  const file = resolve(target);
  console.log(verify(file));
  if (fs.existsSync(DB)) {
    // Fold any pending writes into the main file before setting it aside.
    const db = new DatabaseSync(DB);
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    db.close();
    const aside = path.join(BACKUPS, `before-restore-${stamp()}.db`);
    fs.renameSync(DB, aside);
    console.log(`The database as it was is set aside as ${path.basename(aside)}.`);
  }
  for (const extra of ["-wal", "-shm"]) fs.rmSync(DB + extra, { force: true });
  fs.copyFileSync(file, DB);
  console.log(`Restored ${path.basename(file)}.`);
} else {
  fail("Use: backup | list | verify <file> | restore <file>");
}
