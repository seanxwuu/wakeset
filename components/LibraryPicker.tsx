"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GEAR, GROUPS, LIBRARY, type LibraryItem } from "@/lib/library";

/** A dialog for choosing exercises from the library, or typing one that is not in it. */
export function LibraryPicker({ onAdd, onClose }: { onAdd: (item: Pick<LibraryItem, "name" | "sets" | "cue" | "log">) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [gear, setGear] = useState("");
  const [added, setAdded] = useState(0);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARY.filter((x) => (!group || x.group === group) && (!gear || x.gear === gear) && (!q || x.name.toLowerCase().includes(q) || x.group.toLowerCase().includes(q)));
  }, [query, group, gear]);

  const add = (item: Pick<LibraryItem, "name" | "sets" | "cue" | "log">) => {
    onAdd(item);
    setAdded((n) => n + 1);
  };
  const custom = query.trim();

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()} aria-label="Add exercise">
      <div className="dhead">
        <div className="spread">
          <h3>Add exercise</h3>
          <button className="btn sm primary" onClick={() => ref.current?.close()}>{added ? `Done (${added} added)` : "Close"}</button>
        </div>
        <input type="search" placeholder="Search, or type your own exercise" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={80} aria-label="Search exercises" />
        <div className="grid2">
          <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Muscle group">
            <option value="">All muscle groups</option>
            {GROUPS.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select value={gear} onChange={(e) => setGear(e.target.value)} aria-label="Equipment">
            <option value="">Any equipment</option>
            {GEAR.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="dlist">
        {custom && !found.some((x) => x.name.toLowerCase() === custom.toLowerCase()) && (
          <button className="pick" onClick={() => add({ name: custom, sets: "3 × 10", cue: "" })}>
            <strong>Add “{custom}”</strong>
            <span>Your own exercise. Set the sets, weight and form cue after adding.</span>
          </button>
        )}
        {found.map((x) => (
          <button className="pick" key={x.name} onClick={() => add(x)}>
            <strong>{x.name}</strong>
            <span>{x.group} · {x.gear} · {x.sets}</span>
          </button>
        ))}
        {!found.length && !custom && <p className="quiet">Nothing matches those filters.</p>}
      </div>
    </dialog>
  );
}
