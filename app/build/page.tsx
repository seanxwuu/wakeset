"use client";

import Link from "next/link";
import { useState } from "react";
import { useBoard } from "@/components/board";
import { LibraryPicker } from "@/components/LibraryPicker";
import { Start } from "@/components/Start";
import { uid, type Block, type Day, type Exercise } from "@/lib/types";

const MAX_DAYS = 7;

/** Moves the item at `from` one place up or down. */
function shift<T>(list: T[], from: number, by: -1 | 1) {
  const to = from + by;
  if (to < 0 || to >= list.length) return;
  [list[from], list[to]] = [list[to], list[from]];
}

function Field({ label, value, onChange, max, placeholder, area }: { label: string; value: string; onChange: (v: string) => void; max: number; placeholder?: string; area?: boolean }) {
  return (
    <label className="f">
      {label}
      {area
        ? <textarea rows={2} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

export default function Build() {
  const { state, update, toast } = useBoard();
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [startOver, setStartOver] = useState(false);

  if (!state) return <p className="quiet">Loading…</p>;
  if (!state.routine) return <Start />;

  const { routine } = state;
  const day = routine.days.find((d) => d.id === state.day) ?? routine.days[0];
  const dayIndex = routine.days.indexOf(day);

  // Each helper finds its target again inside the draft, since the draft is a copy.
  const onDay = (change: (d: Day, days: Day[]) => void) => update((s) => { const d = s.routine!.days.find((x) => x.id === day.id); if (d) change(d, s.routine!.days); });
  const onBlock = (id: string, change: (b: Block, blocks: Block[]) => void) => onDay((d) => { const b = d.blocks.find((x) => x.id === id); if (b) change(b, d.blocks); });
  const onEx = (blockId: string, id: string, change: (e: Exercise, list: Exercise[]) => void) => onBlock(blockId, (b) => { const e = b.exercises.find((x) => x.id === id); if (e) change(e, b.exercises); });

  const addDay = () => update((s) => {
    const d: Day = { id: uid(), short: `Day ${s.routine!.days.length + 1}`, title: `Day ${s.routine!.days.length + 1}`, time: "~30 min", focus: "", blocks: [{ id: uid(), title: "Warm-up", how: "5 minutes.", superset: false, exercises: [] }] };
    s.routine!.days.push(d);
    s.day = d.id;
  });
  const copyDay = () => update((s) => {
    const copy: Day = { ...structuredClone(day), id: uid(), short: `${day.short} copy`.slice(0, 24) };
    for (const b of copy.blocks) { b.id = uid(); for (const e of b.exercises) e.id = uid(); }
    s.routine!.days.splice(dayIndex + 1, 0, copy);
    s.day = copy.id;
  });
  const removeDay = () => {
    if (!confirm(`Delete ${day.short || "this day"} and everything in it?`)) return;
    update((s) => { s.routine!.days = s.routine!.days.filter((d) => d.id !== day.id); s.day = s.routine!.days[Math.max(0, dayIndex - 1)]?.id ?? ""; });
    toast("Day deleted");
  };
  const full = routine.days.length >= MAX_DAYS;

  return (
    <>
      <header className="top">
        <h1>Build</h1>
        <Link className="btn sm" href="/">Back to the week</Link>
      </header>

      <div className="card">
        <Field label="Routine name" value={routine.name} max={60} onChange={(v) => update((s) => { s.routine!.name = v; })} />
      </div>

      <h3 style={{ marginTop: 24 }}>Days</h3>
      <p className="quiet small" style={{ margin: "0 0 10px" }}>Up to {MAX_DAYS} a week. Pick one to edit it.</p>
      <nav className="days" role="tablist" aria-label="Training days">
        {routine.days.map((d, i) => (
          <button key={d.id} role="tab" aria-selected={d.id === day?.id} onClick={() => update((s) => { s.day = d.id; })}>
            <span className="d">Day {i + 1}</span>
            <span className="n">{d.short || "Untitled"}</span>
          </button>
        ))}
        {!full && <button className="add" onClick={addDay}><span className="d">+</span><span className="n">Add day</span></button>}
      </nav>

      {!day && <p className="quiet">No days yet. Add one above.</p>}
      {day && (
        <>
          <div className="card stack">
            <div className="grid3">
              <Field label="Title" value={day.title} max={80} placeholder="Upper A: push focus" onChange={(v) => onDay((d) => { d.title = v; })} />
              <Field label="Tab label" value={day.short} max={24} placeholder="Upper A" onChange={(v) => onDay((d) => { d.short = v; })} />
              <Field label="Length" value={day.time} max={20} placeholder="~30 min" onChange={(v) => onDay((d) => { d.time = v; })} />
            </div>
            <Field label="What this session is for" area value={day.focus} max={300} onChange={(v) => onDay((d) => { d.focus = v; })} />
            <div className="row">
              <button className="btn sm" disabled={dayIndex === 0} onClick={() => onDay((_, days) => shift(days, dayIndex, -1))}>Move earlier</button>
              <button className="btn sm" disabled={dayIndex === routine.days.length - 1} onClick={() => onDay((_, days) => shift(days, dayIndex, 1))}>Move later</button>
              <button className="btn sm" disabled={full} onClick={copyDay}>Duplicate</button>
              <button className="btn sm danger" onClick={removeDay}>Delete day</button>
            </div>
          </div>

          {day.blocks.map((b, bi) => (
            <div className={"editblock" + (b.superset ? " superset" : "")} key={b.id}>
              <div className="stack">
                <div className="grid2">
                  <Field label="Block" value={b.title} max={60} placeholder="Superset A" onChange={(v) => onBlock(b.id, (x) => { x.title = v; })} />
                  <Field label="How to run it" value={b.how} max={200} placeholder="4 rounds. Rest 60–75s." onChange={(v) => onBlock(b.id, (x) => { x.how = v; })} />
                </div>
                <div className="spread">
                  <label className="tick">
                    <input type="checkbox" checked={b.superset} onChange={(e) => onBlock(b.id, (x) => { x.superset = e.target.checked; })} />
                    Superset or circuit: do the moves back to back, then rest
                  </label>
                  <div className="row">
                    <button className="icon" aria-label="Move block up" disabled={bi === 0} onClick={() => onBlock(b.id, (_, list) => shift(list, bi, -1))}>↑</button>
                    <button className="icon" aria-label="Move block down" disabled={bi === day.blocks.length - 1} onClick={() => onBlock(b.id, (_, list) => shift(list, bi, 1))}>↓</button>
                    <button className="icon" aria-label="Delete block" onClick={() => { if (!b.exercises.length || confirm(`Delete ${b.title || "this block"} and its exercises?`)) onDay((d) => { d.blocks = d.blocks.filter((x) => x.id !== b.id); }); }}>✕</button>
                  </div>
                </div>
              </div>

              {b.exercises.map((e, ei) => (
                <div className="editex" key={e.id}>
                  <div className="grid3">
                    <Field label="Exercise" value={e.name} max={80} onChange={(v) => onEx(b.id, e.id, (x) => { x.name = v; })} />
                    <Field label="Sets" value={e.sets} max={60} placeholder="4 × 8–10" onChange={(v) => onEx(b.id, e.id, (x) => { x.sets = v; })} />
                    <Field label="Weight" value={e.load ?? ""} max={60} placeholder="30–45 lb" onChange={(v) => onEx(b.id, e.id, (x) => { x.load = v; })} />
                  </div>
                  <div className="grid3">
                    <Field label="Form cue (shown under How to)" value={e.cue ?? ""} max={300} onChange={(v) => onEx(b.id, e.id, (x) => { x.cue = v; })} />
                    <Field label="Tag" value={e.tag ?? ""} max={40} placeholder="Chest position" onChange={(v) => onEx(b.id, e.id, (x) => { x.tag = v; })} />
                    <div className="row end" style={{ alignSelf: "end" }}>
                      <button className="icon" aria-label={`Move ${e.name} up`} disabled={ei === 0} onClick={() => onEx(b.id, e.id, (_, list) => shift(list, ei, -1))}>↑</button>
                      <button className="icon" aria-label={`Move ${e.name} down`} disabled={ei === b.exercises.length - 1} onClick={() => onEx(b.id, e.id, (_, list) => shift(list, ei, 1))}>↓</button>
                      <button className="icon" aria-label={`Delete ${e.name}`} onClick={() => onBlock(b.id, (x) => { x.exercises = x.exercises.filter((y) => y.id !== e.id); })}>✕</button>
                    </div>
                  </div>
                  <label className="tick">
                    <input type="checkbox" checked={Boolean(e.log)} onChange={(ev) => onEx(b.id, e.id, (x) => { x.log = ev.target.checked; })} />
                    Show a box to log the weight used
                  </label>
                </div>
              ))}
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sm primary" disabled={b.exercises.length >= 20} onClick={() => setPickFor(b.id)}>Add exercise</button>
              </div>
            </div>
          ))}

          <div className="row">
            <button className="btn" disabled={day.blocks.length >= 12} onClick={() => onDay((d) => { d.blocks.push({ id: uid(), title: "Superset", how: "3 rounds. Rest 60s.", superset: true, exercises: [] }); })}>Add superset</button>
            <button className="btn" disabled={day.blocks.length >= 12} onClick={() => onDay((d) => { d.blocks.push({ id: uid(), title: "Block", how: "", superset: false, exercises: [] }); })}>Add plain block</button>
          </div>
        </>
      )}

      <div style={{ marginTop: 36 }}>
        <button className="link" onClick={() => setStartOver(!startOver)}>{startOver ? "Keep my routine" : "Start over from a template"}</button>
        {startOver && <div style={{ marginTop: 12 }}><Start replacing onPicked={() => setStartOver(false)} /></div>}
      </div>

      {pickFor && (
        <LibraryPicker
          onClose={() => setPickFor(null)}
          onAdd={(item) => {
            onBlock(pickFor, (b) => { if (b.exercises.length < 20) b.exercises.push({ id: uid(), name: item.name, sets: item.sets, cue: item.cue, ...(item.log ? { log: true } : {}) }); });
            toast(`${item.name} added`);
          }}
        />
      )}
    </>
  );
}
