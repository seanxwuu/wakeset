"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, useBoard } from "./board";
import Rope, { Thinking } from "./Rope";

// Conversations with the assistant, shared by the side panel and the full
// page so both show the same thing. They are kept in this browser only.
type Turn = { role: "user" | "assistant"; content: string };
export type Chat = { id: string; title: string; turns: Turn[]; updatedAt: string };
type Spotter = {
  /** The open conversation's messages. Empty for a new chat. */
  turns: Turn[];
  chats: Chat[];
  chatId: string | null;
  busy: boolean;
  error: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Sends a message and applies whatever he changes. Resolves when he has answered. */
  send: (text: string) => Promise<void>;
  stop: () => void;
  newChat: () => void;
  openChat: (id: string) => void;
  forget: (id: string) => void;
};
const KEEP = "wakeset-chats";
const OLD_KEEP = "wakeset-chat";
const KEEP_OPEN = "wakeset-spotter-open";
const MOST = 30;
const Ctx = createContext<Spotter | null>(null);
export const useSpotter = () => useContext(Ctx)!;
const newId = () => Math.random().toString(36).slice(2, 10);

export function SpotterProvider({ children }: { children: ReactNode }) {
  const { flush, reload, toast } = useBoard();
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpenState] = useState(false);
  const latest = useRef<{ chats: Chat[]; chatId: string | null }>({ chats: [], chatId: null });
  const running = useRef<AbortController | null>(null);

  const keep = (next: Chat[], id: string | null) => {
    latest.current = { chats: next, chatId: id };
    setChats(next);
    setChatId(id);
    try { localStorage.setItem(KEEP, JSON.stringify({ chats: next, chatId: id })); } catch { /* storage is full or off */ }
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEEP) ?? "null") as { chats: Chat[]; chatId: string | null } | null;
      if (saved?.chats) keep(saved.chats, saved.chatId);
      else {
        // The single conversation an earlier version kept.
        const old = JSON.parse(localStorage.getItem(OLD_KEEP) ?? "[]") as Turn[];
        if (old.length) { const id = newId(); keep([{ id, title: old[0].content.slice(0, 80), turns: old, updatedAt: new Date().toISOString() }], id); }
        localStorage.removeItem(OLD_KEEP);
      }
      // Only a wide screen has room to keep the panel docked; on a phone it would cover the page on every visit.
      setOpenState(localStorage.getItem(KEEP_OPEN) === "1" && window.innerWidth >= 1180);
    } catch { /* start fresh */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value);
    try { localStorage.setItem(KEEP_OPEN, value ? "1" : "0"); } catch { /* not remembered */ }
  }, []);

  /** Writes the open conversation's messages, creating the conversation on its first message. */
  const write = (turns: Turn[]) => {
    const { chats: all, chatId: id } = latest.current;
    const now = new Date().toISOString();
    if (id && all.some((c) => c.id === id)) return keep(all.map((c) => (c.id === id ? { ...c, turns, updatedAt: now } : c)), id);
    const fresh = { id: newId(), title: turns[0].content.slice(0, 80), turns, updatedAt: now };
    keep([fresh, ...all].slice(0, MOST), fresh.id);
  };
  const current = () => latest.current.chats.find((c) => c.id === latest.current.chatId)?.turns ?? [];

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || running.current) return;
    const control = (running.current = new AbortController());
    const history = [...current(), { role: "user" as const, content }];
    write(history);
    setError("");
    setBusy(true);
    try {
      // Save anything still pending first, so he reads the routine as it is on screen.
      await flush();
      const { reply, changed } = await api<{ reply: string; changed: boolean }>("POST", "chat", { history: history.slice(-30) }, control.signal);
      write([...history, { role: "assistant", content: reply }]);
      if (changed) {
        await reload();
        toast("Routine updated");
      }
    } catch (e) {
      // Stopped by the person. He may already have changed the routine, so read it again.
      if ((e as Error).name === "AbortError") await reload();
      else setError((e as Error).message);
    } finally {
      running.current = null;
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush, reload, toast]);

  const stop = useCallback(() => running.current?.abort(), []);
  const newChat = useCallback(() => { if (!running.current) { keep(latest.current.chats, null); setError(""); } }, []);
  const openChat = useCallback((id: string) => { if (!running.current) { keep(latest.current.chats, id); setError(""); } }, []);
  const forget = useCallback((id: string) => keep(latest.current.chats.filter((c) => c.id !== id), latest.current.chatId === id ? null : latest.current.chatId), []);

  const turns = chats.find((c) => c.id === chatId)?.turns ?? [];
  return <Ctx.Provider value={{ turns, chats, chatId, busy, error, open, setOpen, send, stop, newChat, openChat, forget }}>{children}</Ctx.Provider>;
}

/** A reply set out as written: paragraphs, lists, and bold. Nothing in it is treated as markup. */
function Formatted({ text }: { text: string }) {
  const inline = (line: string) => line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (/^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="formatted">
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) return <ul key={b}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>)}</ul>;
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) return <ol key={b}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>)}</ol>;
        return <p key={b}>{lines.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{inline(l.replace(/^#+\s*/, ""))}</Fragment>)}</p>;
      })}
    </div>
  );
}

/** The conversation: what has been said, then the box to write in. */
export function SpotterChat() {
  const { me, state } = useBoard();
  const { turns, busy, error, send, stop } = useSpotter();
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [turns, busy, error]);

  if (!me || !state) return <div className="chat-log"><div className="empty"><Thinking>Loading…</Thinking></div></div>;
  const name = me.assistant;
  if (!me.spotter) return <div className="chat-log"><div className="empty"><p>{name} is not connected yet.</p><p><Link href="/spotter">Connect a Claude API key</Link> on the {name} page to switch him on.</p></div></div>;

  const starters = state.routine
    ? ["Make today's session 10 minutes shorter", "My arms are very sore. Ease off the upper days", "Write next week: a bit heavier, a few different moves", "Swap anything that needs a bench"]
    : ["4 days a week, dumbbells only, 30 minutes, lose fat and keep muscle", "3 days at the gym, build strength, about an hour", "No equipment, 20 minutes, 5 days a week"];
  const submit = () => { if (busy) return; send(draft); setDraft(""); };

  return (
    <>
      <div className="chat-log" ref={log} aria-live="polite">
        {turns.length === 0 && (
          <div className="empty">
            <Rope thinking slow />
            <p>Try one of these:</p>
            <div className="chips">{starters.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
          </div>
        )}
        {turns.map((t, i) => <div key={i} className={`bubble ${t.role}`}>{t.role === "assistant" ? <Formatted text={t.content} /> : t.content}</div>)}
        {busy && <div className="bubble assistant thinking"><Thinking>{name} is working on it…</Thinking></div>}
        {error && <p className="problem" role="alert">{error}</p>}
      </div>
      <form className="chat-box" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="chat-row">
          <textarea rows={1} value={draft} maxLength={4000} placeholder={state.routine ? "Make today shorter, swap a move, write next week…" : "How many days, what equipment, how long?"} aria-label={`Message ${name}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
          {busy ? <button type="button" className="btn" onClick={stop}>Stop</button> : <button className="btn primary" disabled={!draft.trim()}>Send</button>}
        </div>
      </form>
    </>
  );
}

/** The assistant beside the page: a button in the corner opens a panel on the right. */
export function SpotterPanel() {
  const path = usePathname();
  const { me } = useBoard();
  const { open, setOpen, turns, newChat, busy } = useSpotter();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // The Spotter page is the same conversation at full size.
  if (!me || path === "/spotter") return null;
  const name = me.assistant;
  if (!open) {
    return (
      <button className="spotter-fab" onClick={() => setOpen(true)} aria-label={`Open ${name}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 5h16v11H9l-5 4z" /></svg>
        {name}
      </button>
    );
  }
  return (
    <aside className="spotter-panel chat" aria-label={name}>
      <div className="card-head">
        <h2>{name}</h2>
        <div className="row">
          {turns.length > 0 && <button className="btn sm" onClick={newChat} disabled={busy}>New chat</button>}
          <button className="btn sm" onClick={() => setOpen(false)}>Close</button>
        </div>
      </div>
      <SpotterChat />
    </aside>
  );
}

/** Earlier conversations, newest first. */
export function SpotterHistory() {
  const { chats, chatId, openChat, forget } = useSpotter();
  if (!chats.length) return null;
  const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <section className="card">
      <div className="card-head"><h2>History</h2><span className="small quiet">{chats.length} conversation{chats.length === 1 ? "" : "s"} · kept in this browser only</span></div>
      <div className="past">
        {[...chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((c) => (
          <div key={c.id} className={`past-row ${c.id === chatId ? "on" : ""}`}>
            <button type="button" className="past-open" onClick={() => openChat(c.id)}>
              <b>{c.title}</b>
              <span>{c.turns.findLast((t) => t.role === "assistant")?.content.replace(/\s+/g, " ").slice(0, 140) ?? "No answer yet"}</span>
            </button>
            <span className="small quiet past-when">{when(c.updatedAt)}</span>
            <button type="button" className="past-x" aria-label={`Delete "${c.title}"`} onClick={() => forget(c.id)}>×</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Connecting the assistant: a person's own Claude API key, entered here and never shown again. */
export function SpotterConnection() {
  const { me, reload, toast } = useBoard();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replacing, setReplacing] = useState(false);
  if (!me) return null;
  const name = me.assistant;
  const { source, last4 } = me.key;

  const run = async (work: () => Promise<{ checked?: boolean }>, done: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await work();
      setKey("");
      setReplacing(false);
      await reload();
      toast(result.checked === false ? "Saved, but Anthropic could not be reached to check it" : done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); run(() => api("PUT", "key", { key }), `${name} is connected`); }}>
      <label className="f">Claude API key
        <input type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} />
      </label>
      <div className="row">
        <button className="btn primary" disabled={busy || !key.trim()}>{busy ? "Checking…" : "Connect"}</button>
        {replacing && <button type="button" className="btn" onClick={() => { setReplacing(false); setKey(""); setError(""); }}>Cancel</button>}
      </div>
      <p className="quiet small">Get a key at console.anthropic.com (API keys). It is checked with Anthropic, stored encrypted, never shown again, and used only for your own messages to {name}. Those messages are billed to your Anthropic account.</p>
    </form>
  );

  return (
    <div className="card stack connection">
      <div className="spread">
        <div>
          <h3><span className={`dot ${source ? "on" : ""}`} />{source ? `${name} is connected` : `Connect ${name}`}</h3>
          {source === "yours" && <p className="quiet">Using your Claude API key ending <span className="mono">{last4}</span>.</p>}
          {source === "site" && <p className="quiet">This site provides {name}, with a daily message limit. Connect your own Claude API key to use your own allowance instead.</p>}
          {!source && <p className="quiet">{name} runs on Claude. Add a Claude API key to switch him on.</p>}
        </div>
        {source === "yours" && !replacing && (
          <div className="row">
            <button className="btn sm" onClick={() => setReplacing(true)}>Replace key</button>
            <button className="btn sm danger" disabled={busy} onClick={() => { if (confirm(`Disconnect your key? ${name} stops working until a key is connected again.`)) run(() => api("DELETE", "key"), "Key removed"); }}>Disconnect</button>
          </div>
        )}
        {source === "site" && !replacing && <button className="btn sm" onClick={() => setReplacing(true)}>Use my own key</button>}
      </div>
      {(!source || replacing) && form}
      {error && <p className="problem" role="alert">{error}</p>}
    </div>
  );
}
