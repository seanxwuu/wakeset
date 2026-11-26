// Starts the built app on a spare port with an empty database and checks the
// things that must hold: each visitor only sees their own routine, saves are
// validated and cannot overwrite a newer copy, accounts work, and requests
// from other sites are refused. Run `npm run build` first.
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = 3299;
const BASE = `http://localhost:${PORT}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wakeset-smoke-"));
// A stand-in for Anthropic, so key checking is tested without the real service: it accepts one key and rejects the rest.
const GOOD_KEY = "sk-ant-smoke-test-key-0123456789abcdWXYZ";
const fake = http.createServer((req, res) => {
  const ok = [req.headers["x-api-key"], String(req.headers.authorization ?? "").replace(/^Bearer /, "")].includes(GOOD_KEY);
  res.writeHead(ok ? 200 : 401, { "content-type": "application/json" });
  res.end(JSON.stringify(ok ? { id: "claude-opus-5-5", type: "model", display_name: "Claude", created_at: "2026-01-01T00:00:00Z" } : { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }));
});
await new Promise((resolve) => fake.listen(3298, resolve));

// Started in its own process group, so stopping it at the end also stops the worker it starts.
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { env: { ...process.env, WAKESET_DATA_DIR: dir, ANTHROPIC_API_KEY: "", ANTHROPIC_BASE_URL: "http://localhost:3298" }, stdio: "pipe", detached: true });
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` ${detail}`}`);
  if (!ok) failed++;
};

/** A visitor: remembers its cookie between calls, like a browser. */
function visitor() {
  let cookie = "";
  const call = async (method, route, body, headers = {}) => {
    const res = await fetch(`${BASE}/api/${route}`, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0].endsWith("=") ? "" : set.split(";")[0];
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
  return { call, get cookie() { return cookie; }, set cookie(v) { cookie = v; } };
}

const routine = (name) => ({
  name,
  days: [{ id: "d1", short: "A", title: "Day A", time: "~30 min", focus: "", blocks: [{ id: "b1", title: "Main", how: "", superset: true, exercises: [{ id: "e1", name: "Push-ups", sets: "3 × 10" }, { id: "e1", name: "Squats", sets: "3 × 15", log: true }] }] }],
});

try {
  for (let i = 0; i < 60; i++) {
    if (await fetch(BASE).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const ana = visitor();
  const first = await ana.call("GET", "state");
  check("a new visitor starts empty and gets a cookie", first.status === 200 && first.body.routine === null && ana.cookie.startsWith("ws_id="));

  const saved = await ana.call("PUT", "state", { routine: routine("Ana's week"), week: 1, day: "d1", checks: { e1: true, gone: true }, weights: { e1: "35" }, rev: 0 });
  const ids = saved.body.routine?.days[0].blocks[0].exercises.map((e) => e.id) ?? [];
  check("a routine saves and the revision goes up", saved.status === 200 && saved.body.rev === 1);
  check("repeated exercise ids are made unique", ids.length === 2 && ids[0] !== ids[1]);
  check("ticks for exercises that do not exist are dropped", saved.body.checks && !("gone" in saved.body.checks));

  const stale = await ana.call("PUT", "state", { ...saved.body, rev: 0 });
  check("a save from an out-of-date copy is refused with the latest state", stale.status === 409 && stale.body.state?.rev === 1);

  const bad = await ana.call("PUT", "state", { routine: { name: "x", days: "nope" }, week: 1, day: "", checks: {}, weights: {}, rev: 1 });
  check("a malformed routine is refused", bad.status === 400);
  const huge = await ana.call("PUT", "state", { ...saved.body, routine: { ...saved.body.routine, name: "x".repeat(500) } });
  check("over-long text is refused", huge.status === 400);

  const ben = visitor();
  check("another visitor cannot see it", (await ben.call("GET", "state")).body.routine === null);

  const forged = visitor();
  forged.cookie = ana.cookie.replace(/\.[^.]+$/, ".AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  check("a cookie with a bad signature is ignored", (await forged.call("GET", "state")).body.routine === null);

  const other = await ana.call("POST", "logout", {}, { origin: "https://evil.example" });
  check("a request from another site is refused", other.status === 403);

  check("a short password is refused", (await ana.call("POST", "signup", { email: "ana@example.com", password: "short" })).status === 400);
  const guestCookie = ana.cookie;
  check("signing up works", (await ana.call("POST", "signup", { email: "Ana@Example.com", password: "correct horse" })).status === 200);
  check("the account keeps what the guest built", (await ana.call("GET", "state")).body.routine?.name === "Ana's week");
  check("the account shows its email", (await ana.call("GET", "me")).body.email === "ana@example.com");
  const old = visitor();
  old.cookie = guestCookie;
  check("the pre-account cookie no longer opens the account", (await old.call("GET", "state")).body.routine === null);
  check("the same email cannot sign up twice", (await ben.call("POST", "signup", { email: "ana@example.com", password: "another one" })).status === 400);

  const phone = visitor();
  check("a wrong password is refused", (await phone.call("POST", "login", { email: "ana@example.com", password: "wrong horse" })).status === 400);
  check("signing in on another device works", (await phone.call("POST", "login", { email: "ana@example.com", password: "correct horse" })).status === 200);
  check("that device sees the account's routine", (await phone.call("GET", "state")).body.routine?.name === "Ana's week");

  await ana.call("POST", "logout");
  check("after signing out the routine is not shown", (await ana.call("GET", "state")).body.routine === null);

  const chat = await phone.call("POST", "chat", { history: [{ role: "user", content: "hi" }] });
  check("with no API key the assistant says it is not connected", chat.status === 502 && /not connected/.test(chat.body.error ?? ""));

  // Connecting a person's own key.
  check("with no key, the assistant shows as off", (await phone.call("GET", "me")).body.spotter === false);
  check("something that is not a key is refused", (await phone.call("PUT", "key", { key: "hello" })).status === 400);
  const rejected = await phone.call("PUT", "key", { key: "sk-ant-wrong-key-0123456789abcdefghij" });
  check("a key Anthropic rejects is refused and not saved", rejected.status === 400 && (await phone.call("GET", "me")).body.spotter === false);
  const connected = await phone.call("PUT", "key", { key: GOOD_KEY });
  check("a working key connects", connected.status === 200 && connected.body.source === "yours" && connected.body.checked === true);
  const mine = await phone.call("GET", "me");
  check("only the last four characters come back", mine.body.spotter === true && mine.body.key.last4 === "WXYZ" && !JSON.stringify([mine.body, connected.body]).includes(GOOD_KEY));
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("wakeset.db"));
  check("the key is not stored in readable form", files.length > 0 && files.every((f) => !fs.readFileSync(path.join(dir, f)).includes(GOOD_KEY)));
  check("another visitor does not get that key", (await ben.call("GET", "me")).body.spotter === false);
  check("disconnecting removes it", (await phone.call("DELETE", "key")).body.source === null && (await phone.call("GET", "me")).body.spotter === false);

  check("erasing needs the password", (await phone.call("DELETE", "me", { password: "nope" })).status === 400);
  check("erasing with the password works", (await phone.call("DELETE", "me", { password: "correct horse" })).status === 200);
  check("the account is gone", (await visitor().call("POST", "login", { email: "ana@example.com", password: "correct horse" })).status === 400);
} catch (error) {
  check("smoke run", false, String(error) + "\n" + log);
} finally {
  try { process.kill(-server.pid); } catch { server.kill(); }
  fake.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} failed` : "\nAll passed");
process.exit(failed ? 1 : 0);
