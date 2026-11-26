"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useBoard } from "@/components/board";
import { useSpotter } from "@/components/spotter";
import { Start } from "@/components/Start";
import { mixItUp } from "@/lib/vary";
import { demoUrl, exercisesOf, progress, type Exercise } from "@/lib/types";

function Row({ e }: { e: Exercise }) {
  const { state, update, toast } = useBoard();
  const [open, setOpen] = useState(false);
  const done = Boolean(state!.checks[e.id]);

  const toggle = () => {
    update((s) => {
      if (s.checks[e.id]) delete s.checks[e.id];
      else s.checks[e.id] = true;
      const day = s.routine!.days.find((d) => d.id === s.day);
      if (day && s.checks[e.id]) {
        const p = progress(day, s.checks);
        if (p.done === p.total) toast(`${day.short} done`);
      }
    });
  };

  return (
    <div className={"ex" + (done ? " is-done" : "")}>
      <button className="check" aria-label={`Mark ${e.name} done`} aria-pressed={done} onClick={toggle}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </button>
      <div>
        <button className="name" onClick={toggle}>{e.name}</button>
        <div className="details">
          <span className="sets">{e.sets}</span>
          {e.load && <span>{e.load}</span>}
          {e.tag && <span className="tag">{e.tag}</span>}
          <button className="howbtn" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide" : "How to"}</button>
        </div>
      </div>
      {e.log && (
        <label className="lb">
          <input inputMode="decimal" placeholder="—" maxLength={12} value={state!.weights[e.id] ?? ""} aria-label={`Weight used for ${e.name}`}
            onChange={(ev) => update((s) => { if (ev.target.value) s.weights[e.id] = ev.target.value; else delete s.weights[e.id]; })} />
          lb
        </label>
      )}
      {open && (
        <div className="howto">
          <p>{e.cue || "No form cue written for this one yet."}</p>
          <a href={demoUrl(e.name)} target="_blank" rel="noopener noreferrer">Watch demo</a>
        </div>
      )}
    </div>
  );
}

type Plan = "same" | "mix" | "spotter";

/** Starting a new week: repeat it, trade a few moves for similar ones, or have the assistant write it. */
function NextWeek({ onClose }: { onClose: () => void }) {
  const { state, me, update, toast } = useBoard();
  const spotter = useSpotter();
  const ref = useRef<HTMLDialogElement>(null);
  const [plan, setPlan] = useState<Plan>("mix");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));
  useEffect(() => { ref.current?.showModal(); }, []);

  const routine = state!.routine!;
  const week = state!.week + 1;
  const mix = mixItUp(routine, seed);
  const name = me?.assistant ?? "Spotter";

  const start = () => {
    update((s) => {
      if (plan === "mix") s.routine = mix.routine;
      s.checks = {};
      s.week += 1;
      s.day = s.routine!.days[0]?.id ?? "";
    });
    toast(`Week ${week} started`);
    ref.current?.close();
    if (plan === "spotter") {
      spotter.setOpen(true);
      spotter.send(`I'm starting week ${week}. Write this week's version of my routine from last week's.`);
    }
  };

  const Choice = ({ value, title, children }: { value: Plan; title: string; children: React.ReactNode }) => (
    <label className={"choice" + (plan === value ? " on" : "")}>
      <input type="radio" name="plan" checked={plan === value} onChange={() => setPlan(value)} />
      <span><b>{title}</b><span>{children}</span></span>
    </label>
  );

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()} aria-label={`Start week ${week}`}>
      <div className="dhead"><h3>Start week {week}</h3><p className="quiet small">Your ticks are cleared. The weights you logged stay, so you can see what to beat.</p></div>
      <div className="dlist">
        <Choice value="mix" title="Mix it up">One move in each superset or circuit is traded for a similar one that works the same muscles and needs no new equipment.</Choice>
        {plan === "mix" && (
          <div className="swaps">
            {mix.swaps.length === 0 && <p className="quiet small">Nothing in this routine has a stand-in in the library, so the week would stay the same.</p>}
            {mix.swaps.map((s, i) => <div key={i}><span className="quiet">{s.day} · {s.block}</span><span>{s.from} <b>→ {s.to}</b></span></div>)}
            {mix.swaps.length > 0 && <button className="link" onClick={() => setSeed(seed + 7)}>Shuffle for a different mix</button>}
          </div>
        )}
        <Choice value="same" title="Repeat this week">The same exercises again.</Choice>
        {me?.spotter && <Choice value="spotter" title={`Have ${name} write it`}>He nudges the weights up from what you logged and changes a few moves, then tells you what he did.</Choice>}
      </div>
      <div className="dfoot">
        <button className="btn" onClick={() => ref.current?.close()}>Cancel</button>
        <button className="btn primary" onClick={start}>Start week {week}</button>
      </div>
    </dialog>
  );
}

export default function Week() {
  const { state, update, toast } = useBoard();
  const [next, setNext] = useState(false);
  if (!state) return <p className="quiet">Loading…</p>;
  if (!state.routine) return <Start />;

  const { routine } = state;
  const day = routine.days.find((d) => d.id === state.day) ?? routine.days[0];
  const finished = (d: typeof day) => { const p = progress(d, state.checks); return p.total > 0 && p.done === p.total; };
  const sessions = routine.days.filter(finished).length;
  const p = day ? progress(day, state.checks) : { done: 0, total: 0 };

  return (
    <>
      <header className="top">
        <h1>{routine.name || "My routine"}</h1>
        <div className="week"><strong>Week {state.week}</strong><span>{sessions} of {routine.days.length} sessions done</span></div>
      </header>

      <nav className="days" role="tablist" aria-label="Training days">
        {routine.days.map((d, i) => {
          const dp = progress(d, state.checks);
          return (
            <button key={d.id} role="tab" aria-selected={d.id === day?.id} className={finished(d) ? "done" : ""} onClick={() => update((s) => { s.day = d.id; })}>
              <span className="d">Day {i + 1}</span>
              <span className="n">{d.short}</span>
              <span className="bar"><i style={{ width: `${dp.total ? (dp.done / dp.total) * 100 : 0}%` }} /></span>
            </button>
          );
        })}
      </nav>

      {day && (
        <div>
          <div className="dayhead"><h2>{day.title || day.short}</h2><span className="meta">{[day.time, `${p.done} of ${p.total} done`].filter(Boolean).join(", ")}</span></div>
          {day.focus && <p className="focus">{day.focus}</p>}
          {day.blocks.map((b) => (
            <section className="block" key={b.id}>
              <h3>{b.title}</h3>
              {b.how && <p className="how">{b.how}</p>}
              <div className={"group" + (b.superset ? " superset" : "")}>{b.exercises.map((e) => <Row key={e.id} e={e} />)}</div>
            </section>
          ))}
          {p.total === 0 && <p className="quiet">Nothing on this day yet. <Link href="/build">Add exercises in Build.</Link></p>}
        </div>
      )}

      <div className="actions">
        <button className="btn" onClick={() => { update((s) => { for (const e of exercisesOf(day)) delete s.checks[e.id]; }); toast("Day cleared"); }}>Clear this day</button>
        <button className="btn primary" onClick={() => setNext(true)}>Start next week</button>
        <Link className="btn" href="/build">Edit routine</Link>
      </div>
      {next && <NextWeek onClose={() => setNext(false)} />}
    </>
  );
}
