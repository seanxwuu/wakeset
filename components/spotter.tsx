"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, useBoard } from "./board";

// The conversation with the assistant, shared by the side panel and the
// full page so both show the same thing. It is kept in this browser only.
type Turn = { role: "user" | "assistant"; content: string };
type Spotter = {
  turns: Turn[];
  busy: boolean;
  error: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Sends a message and applies whatever he changes. Resolves when he has answered. */
  send: (text: string) => Promise<void>;
  clear: () => void;
};
const KEEP = "wakeset-chat";
const KEEP_OPEN = "wakeset-spotter-open";
const Ctx = createContext<Spotter | null>(null);
export const useSpotter = () => useContext(Ctx)!;

export function SpotterProvider({ children }: { children: ReactNode }) {
  const { flush, reload, toast } = useBoard();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpenState] = useState(false);
  const latest = useRef<Turn[]>([]);
  const running = useRef(false);

  useEffect(() => {
    try {
      latest.current = JSON.parse(localStorage.getItem(KEEP) ?? "[]");
      setTurns(latest.current);
      // Only a wide screen has room to keep the panel docked; on a phone it would cover the page on every visit.
      setOpenState(localStorage.getItem(KEEP_OPEN) === "1" && window.innerWidth >= 1180);
    } catch { /* start fresh */ }
  }, []);
  const keep = (next: Turn[]) => {
    latest.current = next;
    setTurns(next);
    try { localStorage.setItem(KEEP, JSON.stringify(next)); } catch { /* storage is full or off */ }
  };
  const setOpen = useCallback((value: boolean) => {
    setOpenState(value);
    try { localStorage.setItem(KEEP_OPEN, value ? "1" : "0"); } catch { /* not remembered */ }
  }, []);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || running.current) return;
    running.current = true;
    const history = [...latest.current, { role: "user" as const, content }];
    keep(history);
    setError("");
    setBusy(true);
    try {
      // Save anything still pending first, so he reads the routine as it is on screen.
      await flush();
      const { reply, changed } = await api<{ reply: string; changed: boolean }>("POST", "chat", { history: history.slice(-30) });
      keep([...history, { role: "assistant", content: reply }]);
      if (changed) {
        await reload();
        toast("Routine updated");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [flush, reload, toast]);

  const clear = useCallback(() => { keep([]); setError(""); }, []);

  return <Ctx.Provider value={{ turns, busy, error, open, setOpen, send, clear }}>{children}</Ctx.Provider>;
}

/** The conversation itself: suggestions, messages and the box to write in. */
export function SpotterChat() {
  const { me, state } = useBoard();
  const { turns, busy, error, send } = useSpotter();
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [turns, busy]);

  if (!me || !state) return <p className="quiet">Loading…</p>;
  const name = me.assistant;
  if (!me.spotter) return <div className="card"><h3>{name} is not connected yet</h3><p><Link href="/spotter">Connect a Claude API key</Link> on the {name} page to switch him on. Until then, build your routine by hand in <Link href="/build">Build</Link>.</p></div>;

  const ideas = state.routine
    ? ["Make today's session 10 minutes shorter", "My arms are very sore. Ease off the upper days", "Write next week: a bit heavier, a few different moves", "Swap anything that needs a bench"]
    : ["4 days a week, dumbbells only, 30 minutes, lose fat and keep muscle", "3 days at the gym, build strength, about an hour", "No equipment, 20 minutes, 5 days a week"];
  const submit = () => { send(draft); setDraft(""); };

  return (
    <div className="spotter">
      <div className="chat" aria-live="polite">
        {turns.length === 0 && <div className="chips">{ideas.map((i) => <button key={i} className="chip" onClick={() => send(i)}>{i}</button>)}</div>}
        {turns.map((t, i) => <div key={i} className={`msg ${t.role}`}>{t.content}</div>)}
        {busy && <div className="msg assistant thinking">{name} is working on it…</div>}
        {error && <p className="problem" role="alert">{error}</p>}
        <div ref={end} />
      </div>
      <form className="compose" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <textarea rows={2} value={draft} maxLength={4000} placeholder={`Message ${name}`} aria-label={`Message ${name}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
        <button className="btn primary" disabled={busy || !draft.trim()}>Send</button>
      </form>
      <p className="quiet small">{name} gives general training guidance, not medical advice.</p>
    </div>
  );
}

/** The assistant beside the page: a button in the corner opens a panel on the right. */
export function SpotterPanel() {
  const path = usePathname();
  const { me } = useBoard();
  const { open, setOpen, turns, clear } = useSpotter();
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
    <aside className="spotter-panel" aria-label={name}>
      <div className="spotter-head">
        <h3>{name}</h3>
        <div className="row">
          {turns.length > 0 && <button className="btn sm" onClick={() => { if (confirm("Clear this conversation?")) clear(); }}>Clear</button>}
          <button className="btn sm" onClick={() => setOpen(false)}>Close</button>
        </div>
      </div>
      <SpotterChat />
    </aside>
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
