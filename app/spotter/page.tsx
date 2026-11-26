"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, useBoard } from "@/components/board";

type Turn = { role: "user" | "assistant"; content: string };
const KEEP = "wakeset-chat";

export default function Spotter() {
  const { me, state, flush, reload, toast } = useBoard();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);

  // The conversation is kept in this browser only.
  useEffect(() => {
    try { setTurns(JSON.parse(localStorage.getItem(KEEP) ?? "[]")); } catch { /* start fresh */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEEP, JSON.stringify(turns)); } catch { /* storage is full or off */ }
    end.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy]);

  if (!me || !state) return <p className="quiet">Loading…</p>;
  const name = me.assistant;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...turns, { role: "user" as const, content }];
    setTurns(history);
    setDraft("");
    setError("");
    setBusy(true);
    try {
      // Save anything still pending first, so he reads the routine as it is on screen.
      await flush();
      const { reply, changed } = await api<{ reply: string; changed: boolean }>("POST", "chat", { history: history.slice(-30) });
      setTurns([...history, { role: "assistant", content: reply }]);
      if (changed) {
        await reload();
        toast("Routine updated");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ideas = state.routine
    ? ["Make today's session 10 minutes shorter", "My arms are very sore. Ease off the upper days", "Add a sixth day for mobility", "Swap anything that needs a bench"]
    : ["4 days a week, dumbbells only, 30 minutes, lose fat and keep muscle", "3 days at the gym, build strength, about an hour", "No equipment, 20 minutes, 5 days a week"];

  return (
    <>
      <header className="top">
        <h1>{name}</h1>
        {turns.length > 0 && <button className="btn sm" onClick={() => { if (confirm("Clear this conversation?")) setTurns([]); }}>Clear chat</button>}
      </header>
      <p className="lede">Tell {name} what you want from your week and he writes or changes the routine for you. You can still edit everything by hand in <Link href="/build">Build</Link>.</p>

      {!me.spotter && <div className="card"><h3>{name} is not switched on yet</h3><p>This site has no AI key set up. Build your routine by hand in <Link href="/build">Build</Link> for now.</p></div>}

      {me.spotter && (
        <>
          {turns.length === 0 && <div className="chips">{ideas.map((i) => <button key={i} className="chip" onClick={() => send(i)}>{i}</button>)}</div>}
          <div className="chat" aria-live="polite">
            {turns.map((t, i) => <div key={i} className={`msg ${t.role}`}>{t.content}</div>)}
            {busy && <div className="msg assistant thinking">{name} is working on it…</div>}
            {error && <p className="problem" role="alert" style={{ margin: 0 }}>{error}</p>}
            <div ref={end} />
          </div>
          <form className="compose" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
            <textarea rows={2} value={draft} maxLength={4000} placeholder={`Message ${name}`} aria-label={`Message ${name}`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }} />
            <button className="btn primary" disabled={busy || !draft.trim()}>Send</button>
          </form>
          <p className="quiet small">{name} gives general training guidance, not medical advice.</p>
        </>
      )}
    </>
  );
}
