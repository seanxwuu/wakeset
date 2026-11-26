import { cueFor, LIBRARY } from "./library";
import { uid, type Routine } from "./types";

// "Mix it up": a new week that is not a copy of the last one. In each working
// block (not warm-ups or cool-downs) one exercise is traded for a similar one:
// same movement, and nothing the first one did not need (a floor press is never
// traded for a bench press). Nothing here needs the assistant.

/** Moves that can stand in for each other. Each line is one movement on one kind of equipment. */
const ALIKE: string[][] = [
  ["DB floor press", "DB alternating floor press", "DB close-grip floor press"],
  ["DB bench press", "DB incline press"],
  ["DB chest fly", "DB pullover"],
  ["Bent-over DB row", "One-arm DB row", "DB renegade row"],
  ["DB reverse fly", "DB shrug"],
  ["DB overhead press", "DB Arnold press", "DB push press"],
  ["DB lateral raise", "DB front raise"],
  ["DB biceps curl", "DB hammer curl"],
  ["DB skull crusher", "DB overhead triceps extension", "DB triceps kickback"],
  ["DB goblet squat", "DB sumo squat", "DB thruster"],
  ["DB reverse lunge", "DB walking lunge", "DB step-up", "DB Bulgarian split squat"],
  ["DB Romanian deadlift", "DB single-leg Romanian deadlift", "DB hip thrust", "DB two-hand swing"],
  ["DB Russian twist", "DB suitcase side bend", "DB weighted crunch"],
  ["Push-ups", "Incline push-ups", "Decline push-ups", "Close-grip push-ups", "Pike push-ups"],
  ["Bodyweight squats", "Jump squats"],
  ["Reverse lunges", "Side lunges"],
  ["Glute bridges", "Single-leg glute bridge"],
  ["Plank", "Side plank", "Hollow hold"],
  ["Dead bug", "Bicycle crunch", "Leg raises", "Bird dog"],
  ["Mountain climbers", "Burpees", "High knees", "Jumping jacks"],
  ["Barbell bench press", "Incline barbell press"],
  ["Back squat", "Front squat"],
  ["Romanian deadlift", "Barbell hip thrust"],
  ["Pull-ups", "Chin-ups"],
  ["Lat pulldown", "Seated cable row"],
];

const plain = (name: string) => name.replace(/\(.*?\)|,.*$/g, "").trim().toLowerCase();
const groupOf = new Map<string, string[]>(ALIKE.flatMap((group) => group.map((name) => [name.toLowerCase(), group] as [string, string[]])));
const inLibrary = new Map(LIBRARY.map((x) => [x.name.toLowerCase(), x]));

export type Swap = { day: string; block: string; from: string; to: string };

/**
 * The routine with one exercise traded in each working block, and the list of
 * trades. `seed` picks which; a different seed gives a different mix.
 */
export function mixItUp(routine: Routine, seed: number): { routine: Routine; swaps: Swap[] } {
  const swaps: Swap[] = [];
  let n = seed;
  const next = structuredClone(routine);
  for (const day of next.days) {
    const taken = new Set(day.blocks.flatMap((b) => b.exercises.map((e) => plain(e.name))));
    for (const block of day.blocks) {
      if (/warm|cool|stretch|mobility/i.test(block.title)) continue;
      // Exercises here that have a stand-in the day is not already using. A tag marks a move tied to specific kit, so those stay.
      const options = block.exercises.flatMap((e, index) => {
        const stand = e.tag ? [] : (groupOf.get(plain(e.name)) ?? []).filter((name) => !taken.has(name.toLowerCase()));
        return stand.length ? [{ index, stand }] : [];
      });
      if (!options.length) continue;
      const pick = options[n++ % options.length];
      const to = pick.stand[n++ % pick.stand.length];
      const old = block.exercises[pick.index];
      const known = inLibrary.get(to.toLowerCase());
      // Keeps the block's set count and timing. The old weight is dropped: it was for a different move.
      block.exercises[pick.index] = { id: uid(), name: to, sets: old.sets, cue: cueFor(to) ?? "", ...(known?.log ? { log: true } : {}) };
      taken.delete(plain(old.name));
      taken.add(to.toLowerCase());
      swaps.push({ day: day.short || day.title, block: block.title, from: old.name, to });
    }
  }
  return { routine: next, swaps };
}
