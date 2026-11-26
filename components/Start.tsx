"use client";

import Link from "next/link";
import { BLANK, TEMPLATES } from "@/lib/templates";
import { withIds, type RoutineInput } from "@/lib/types";
import { useBoard } from "./board";

/** Starter routines to pick from. Used on a first visit and from the builder's "start over". */
export function Start({ replacing = false, onPicked }: { replacing?: boolean; onPicked?: () => void }) {
  const { update, me, toast } = useBoard();

  const use = (routine: RoutineInput, label: string) => {
    if (replacing && !confirm("Replace your current routine with this one? Your ticks and logged weights will be cleared.")) return;
    update((s) => {
      s.routine = withIds(routine);
      s.day = s.routine.days[0].id;
      s.checks = {};
      s.weights = {};
      s.week = replacing ? s.week : 1;
    });
    toast(`${label} loaded`);
    onPicked?.();
  };

  return (
    <div>
      {!replacing && (
        <>
          <h1>Build your<br />week</h1>
          <p className="lede">Pick a starting point. Everything in it can be changed: days, blocks, exercises, sets and weights.</p>
        </>
      )}
      {TEMPLATES.map((t) => (
        <div className="card spread" key={t.id}>
          <div>
            <h3>{t.title}</h3>
            <p>{t.summary}</p>
            <p className="quiet small">{t.routine.days.length} days a week. Needs: {t.gear}.</p>
          </div>
          <button className="btn primary" onClick={() => use(t.routine, t.routine.name)}>Use this</button>
        </div>
      ))}
      <div className="card spread">
        <div>
          <h3>Blank week</h3>
          <p>One empty day. Add your own days and exercises.</p>
        </div>
        <button className="btn" onClick={() => use(BLANK, "Blank week")}>Start blank</button>
      </div>
      {me?.spotter && !replacing && (
        <div className="card spread">
          <div>
            <h3>Ask {me.assistant}</h3>
            <p>Say how many days, what equipment you have and how long you want to train. He writes the week.</p>
          </div>
          <Link className="btn" href="/spotter">Ask {me.assistant}</Link>
        </div>
      )}
    </div>
  );
}
