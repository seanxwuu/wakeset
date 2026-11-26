import crypto from "node:crypto";
import { rootSecret } from "./secrets";
import * as store from "./store";

// Who is asking. Every visitor has an id held in a signed cookie. A new
// visitor is a guest: the id exists only in their browser until they save
// something. Making an account attaches an email and password to that same
// id, so what they built as a guest stays; signing in on another device
// swaps that device's cookie for the account's id.
export const COOKIE = "ws_id";
const DAYS = 180;

type User = { id: string; email: string; hash: string; createdAt: string; version: number };
export type Identity = { id: string; email: string | null };

const sign = (text: string) => crypto.createHmac("sha256", rootSecret()).update(text).digest("base64url");
const same = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const userKey = (email: string) => `user:${email}`;
const ownerKey = (id: string) => `owner:${id}`;
const cleanEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();
const byEmail = (email: string) => store.read<User | null>(store.SYSTEM, userKey(email), null);
/** The account, if any, attached to an id. */
function byId(id: string): User | null {
  const email = store.read<string>(store.SYSTEM, ownerKey(id), "");
  const user = email ? byEmail(email) : null;
  return user && user.id === id ? user : null;
}

export function cookieFor(id: string, version = 0) {
  const body = `${id}.${version}.${Date.now() + DAYS * 864e5}`;
  return `${body}.${sign(body)}`;
}
export const newGuest = () => `g${crypto.randomBytes(12).toString("hex")}`;

/** Reads the cookie. Anything unsigned, expired, or signed before a sign-out-everywhere is treated as no cookie. */
export function identify(cookie?: string): Identity | null {
  const parts = (cookie ?? "").split(".");
  if (parts.length !== 4) return null;
  const [id, version, expires, mac] = parts;
  if (!/^g[a-f0-9]{24}$/.test(id) || !same(mac, sign(`${id}.${version}.${expires}`)) || Number(expires) < Date.now()) return null;
  const user = byId(id);
  if (user && user.version !== Number(version)) return null;
  return { id, email: user?.email ?? null };
}

// Password hashing: scrypt with a per-user salt.
function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}
function checkPassword(password: string, stored: string) {
  const [salt] = stored.split(":");
  return same(hashPassword(password, salt), stored);
}

// Wrong passwords are throttled per address and per email.
const tries = new Map<string, { count: number; resetAt: number }>();
function throttle(key: string, limit = 10, windowMs = 15 * 60_000) {
  const now = Date.now();
  const entry = tries.get(key);
  if (!entry || entry.resetAt < now) {
    if (tries.size > 5000) for (const [k, v] of tries) if (v.resetAt < now) tries.delete(k);
    tries.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (++entry.count > limit) throw new Error("Too many tries. Wait a few minutes and try again.");
}

function credentials(input: Record<string, unknown>) {
  const email = cleanEmail(input.email);
  const password = String(input.password ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("Enter a valid email address.");
  return { email, password };
}

/** Attaches an email and password to the visitor's current id. Returns the cookie to set. */
export function signUp(me: Identity, input: Record<string, unknown>, address: string) {
  throttle(`signup:${address}`, 10, 60 * 60_000);
  if (me.email) throw new Error("You are already signed in.");
  const { email, password } = credentials(input);
  if (password.length < 8 || password.length > 200) throw new Error("Use a password of at least 8 characters.");
  if (byEmail(email)) throw new Error("There is already an account with that email. Sign in instead.");
  const user: User = { id: me.id, email, hash: hashPassword(password), createdAt: new Date().toISOString(), version: 1 };
  store.write(store.SYSTEM, userKey(email), user);
  store.write(store.SYSTEM, ownerKey(user.id), email);
  return cookieFor(user.id, user.version);
}

export function signIn(input: Record<string, unknown>, address: string) {
  const { email, password } = credentials(input);
  throttle(`login:${address}`, 30);
  throttle(`login:${email}`);
  const user = byEmail(email);
  // Hash even when there is no such account, so the reply takes as long either way.
  const ok = checkPassword(password, user?.hash ?? hashPassword("x", "00"));
  if (!user || !ok) throw new Error("That email and password do not match.");
  return cookieFor(user.id, user.version);
}

/** Deletes the account and everything it stored. */
export function deleteAccount(me: Identity, input: Record<string, unknown>) {
  const user = byId(me.id);
  if (user && !checkPassword(String(input.password ?? ""), user.hash)) throw new Error("That password is not right.");
  store.purge(me.id);
  if (user) {
    store.remove(store.SYSTEM, userKey(user.email));
    store.remove(store.SYSTEM, ownerKey(user.id));
  }
}
