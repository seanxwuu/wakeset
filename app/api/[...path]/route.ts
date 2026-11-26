import { NextResponse } from "next/server";
import * as auth from "@/lib/auth";
import { chat, hasSpotter, spotterError } from "@/lib/spotter";
import { Conflict, getState, putState } from "@/lib/state";
import { ASSISTANT } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ path: string[] }> };
const MAX_BODY = 400_000;

// A browser sends Origin on state-changing requests. If it names another
// site, the request did not come from this app.
function crossSite(request: Request) {
  if (request.method === "GET") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return true;
  }
}

// Per-caller request budget: generous for a person, tight enough to blunt a script.
const hits = new Map<string, { count: number; resetAt: number }>();
function overLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  return ++entry.count > limit;
}

class Refused extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** What a handler returns: the JSON body, and optionally a new cookie (or null to clear it). */
type Out = { body: unknown; cookie?: string | null };

async function handle(request: Request, path: string[], me: auth.Identity, address: string): Promise<Out> {
  const body = async () => {
    const text = await request.text();
    if (text.length > MAX_BODY) throw new Refused("That is too large to save.", 413);
    try {
      return JSON.parse(text || "{}") as Record<string, unknown>;
    } catch {
      throw new Refused("That request could not be read.", 400);
    }
  };

  switch (`${request.method} ${path.join("/")}`) {
    case "GET me":
      return { body: { email: me.email, spotter: hasSpotter(), assistant: ASSISTANT } };
    case "GET state":
      return { body: getState(me.id) };
    case "PUT state":
      return { body: putState(me.id, await body()) };

    case "POST signup":
      return { body: { ok: true }, cookie: auth.signUp(me, await body(), address) };
    case "POST login":
      return { body: { ok: true }, cookie: auth.signIn(await body(), address) };
    case "POST logout":
      return { body: { ok: true }, cookie: null };
    case "DELETE me":
      auth.deleteAccount(me, await body());
      return { body: { ok: true }, cookie: null };

    case "POST chat": {
      if (overLimit(`chat:${address}`, 30, 60 * 60_000)) throw new Refused(`Too many messages to ${ASSISTANT} from this network. Try again in an hour.`, 429);
      try {
        return { body: await chat(me.id, (await body()).history, request.signal) };
      } catch (error) {
        if (error instanceof Refused) throw error;
        console.error("chat failed", error);
        throw new Refused(spotterError(error), 502);
      }
    }
  }
  throw new Refused("Not found.", 404);
}

async function serve(request: Request, ctx: Ctx) {
  const address = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (crossSite(request)) return NextResponse.json({ error: "That request came from another site." }, { status: 403 });
  if (overLimit(`all:${address}`, Number(process.env.WAKESET_RATE_LIMIT || 300))) return NextResponse.json({ error: "Too many requests. Slow down a little." }, { status: 429 });

  const cookies = Object.fromEntries((request.headers.get("cookie") ?? "").split(/;\s*/).map((c) => c.split("=") as [string, string]));
  const known = auth.identify(cookies[auth.COOKIE]);
  // A visitor with no valid cookie becomes a new guest. Nothing is stored for them until they save.
  const me = known ?? { id: auth.newGuest(), email: null };

  let out: Out;
  let status = 200;
  try {
    out = await handle(request, (await ctx.params).path, me, address);
  } catch (error) {
    status = error instanceof Refused ? error.status : error instanceof Conflict ? 409 : 400;
    if (status === 400 && !(error instanceof Error)) console.error(error);
    out = { body: { error: error instanceof Error ? error.message : "Something went wrong.", ...(error instanceof Conflict ? { state: error.state } : {}) } };
  }

  const response = NextResponse.json(out.body, { status, headers: { "Cache-Control": "no-store" } });
  const cookie = out.cookie === undefined ? (known ? undefined : auth.cookieFor(me.id)) : out.cookie;
  if (cookie !== undefined) {
    const secure = (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")) === "https";
    response.cookies.set(auth.COOKIE, cookie ?? "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: cookie ? 180 * 86400 : 0 });
  }
  return response;
}

export { serve as GET, serve as POST, serve as PUT, serve as DELETE };
