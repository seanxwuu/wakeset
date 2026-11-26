"use client";

import Link from "next/link";
import { useState } from "react";
import { useBoard } from "@/components/board";
import { Start } from "@/components/Start";
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

export default function Week() {
  const { state, update, toast } = useBoard();
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
        <button className="btn primary" onClick={() => {
          if (!confirm("Clear all ticks and start the next week? Your logged weights stay.")) return;
          update((s) => { s.checks = {}; s.week += 1; s.day = s.routine!.days[0]?.id ?? ""; });
          toast(`Week ${state.week + 1} started`);
        }}>Start next week</button>
        <Link className="btn" href="/build">Edit routine</Link>
      </div>
    </>
  );
}
