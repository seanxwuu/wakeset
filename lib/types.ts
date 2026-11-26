import { z } from "zod";

// The shape of a routine, shared by the browser, the API and Spotter.
// Routine -> days -> blocks -> exercises. A block marked `superset` is done
// back to back (two moves is a superset, more is a circuit).
const text = (max: number) => z.string().trim().max(max);
const idField = z.string().regex(/^[\w-]{1,40}$/);

export const ExerciseInput = z.object({
  name: text(80).min(1),
  sets: text(60).describe('Sets and reps as written on the board, e.g. "4 × 8–10", "3 × 45s", "1 min"'),
  load: text(60).optional().describe('Suggested weight, e.g. "30–45 lb" or "35 lb (one DB)". Leave out for bodyweight moves.'),
  tag: text(40).optional().describe('Short label shown as a chip, e.g. a push-up board position or "per side".'),
  cue: text(300).optional().describe("One-line form cue shown under How to."),
  log: z.boolean().optional().describe("True for weighted moves, so the board shows a box to log the weight used."),
});
export const BlockInput = z.object({
  title: text(60).describe('e.g. "Warm-up", "Superset A", "Core circuit"'),
  how: text(200).describe('How to run the block, e.g. "4 rounds. Rest 60–75s after each round."'),
  superset: z.boolean().describe("True when the moves are done back to back before resting."),
  exercises: z.array(ExerciseInput).max(20),
});
export const DayInput = z.object({
  short: text(24).describe('Tab label, e.g. "Upper A"'),
  title: text(80).describe('e.g. "Upper A: push focus"'),
  time: text(20).describe('e.g. "~30 min"'),
  focus: text(300).describe("One sentence on what the session is for."),
  blocks: z.array(BlockInput).max(12),
});
export const RoutineInput = z.object({ name: text(60), days: z.array(DayInput).min(1).max(7) });

export const Exercise = ExerciseInput.extend({ id: idField });
export const Block = BlockInput.extend({ id: idField, exercises: z.array(Exercise).max(20) });
export const Day = DayInput.extend({ id: idField, blocks: z.array(Block).max(12) });
export const Routine = z.object({ name: text(60), days: z.array(Day).max(7) });

export const State = z.object({
  routine: Routine.nullable(),
  week: z.number().int().min(1).max(9999),
  /** The day tab that is open. */
  day: z.string().max(40),
  /** Exercise id -> done this week. */
  checks: z.record(z.string().max(40), z.boolean()),
  /** Exercise id -> weight last logged. Kept when a new week starts. */
  weights: z.record(z.string().max(40), z.string().max(12)),
  /** Goes up by one on every save, so two devices cannot silently overwrite each other. */
  rev: z.number().int().min(0),
});

export type Exercise = z.infer<typeof Exercise>;
export type Block = z.infer<typeof Block>;
export type Day = z.infer<typeof Day>;
export type Routine = z.infer<typeof Routine>;
export type RoutineInput = z.infer<typeof RoutineInput>;
export type DayInput = z.infer<typeof DayInput>;
export type State = z.infer<typeof State>;

export const EMPTY: State = { routine: null, week: 1, day: "", checks: {}, weights: {}, rev: 0 };

/** The assistant's name, in one place. */
export const ASSISTANT = "Spotter";

export const uid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

const key = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Gives every day, block and exercise an id. Where `previous` has an exercise
 * of the same name in the same day position, its id is kept, so checks and
 * logged weights survive an edit that leaves that exercise alone.
 */
export function withIds(input: RoutineInput, previous?: Routine | null): Routine {
  const used = new Set<string>();
  const fresh = () => {
    let id = uid();
    while (used.has(id)) id = uid();
    used.add(id);
    return id;
  };
  return {
    name: input.name,
    days: input.days.map((day, i) => {
      const old = previous?.days[i];
      const pool = new Map<string, string[]>();
      for (const e of old?.blocks.flatMap((b) => b.exercises) ?? []) pool.set(key(e.name), [...(pool.get(key(e.name)) ?? []), e.id]);
      const dayId = old && !used.has(old.id) ? (used.add(old.id), old.id) : fresh();
      return {
        ...day,
        id: dayId,
        blocks: day.blocks.map((block) => ({
          ...block,
          id: fresh(),
          exercises: block.exercises.map((e) => {
            const kept = pool.get(key(e.name))?.shift();
            return { ...e, id: kept && !used.has(kept) ? (used.add(kept), kept) : fresh() };
          }),
        })),
      };
    }),
  };
}

/** Replaces any missing or repeated id, so nothing saved can make two rows share one. */
export function uniqueIds(routine: Routine): Routine {
  const used = new Set<string>();
  const fix = (id: string) => {
    while (!id || used.has(id)) id = uid();
    used.add(id);
    return id;
  };
  return {
    ...routine,
    days: routine.days.map((d) => ({ ...d, id: fix(d.id), blocks: d.blocks.map((b) => ({ ...b, id: fix(b.id), exercises: b.exercises.map((e) => ({ ...e, id: fix(e.id) })) })) })),
  };
}

export const exercisesOf = (day: Day) => day.blocks.flatMap((b) => b.exercises);
export function progress(day: Day, checks: Record<string, boolean>) {
  const all = exercisesOf(day);
  return { done: all.filter((e) => checks[e.id]).length, total: all.length };
}

/** A YouTube search for the move, the same "Watch demo" link the first board had. */
export const demoUrl = (name: string) =>
  "https://www.youtube.com/results?search_query=" + encodeURIComponent(name.replace(/\(.*?\)|,.*$/g, "").trim() + " exercise form");
