import * as store from "./store";
import { EMPTY, State, uniqueIds } from "./types";

export class Conflict extends Error {
  constructor(public state: State) {
    super("This routine was changed somewhere else. Showing the latest version.");
  }
}

export const getState = (owner: string): State => store.read<State>(owner, "state", EMPTY);

/** Saves what the browser sent, unless someone saved after the copy it started from. */
export function putState(owner: string, input: unknown): State {
  const parsed = State.safeParse(input);
  if (!parsed.success) throw new Error("That routine could not be saved: " + (parsed.error.issues[0]?.message ?? "it is not in the expected shape") + ".");
  const current = getState(owner);
  if (parsed.data.rev !== current.rev) throw new Conflict(current);
  return save(owner, parsed.data);
}

/** Writes a state as the next revision, dropping checks and weights for exercises that no longer exist. */
export function save(owner: string, state: State): State {
  const routine = state.routine ? uniqueIds(state.routine) : null;
  const ids = new Set(routine?.days.flatMap((d) => d.blocks.flatMap((b) => b.exercises.map((e) => e.id))) ?? []);
  const keep = <T,>(map: Record<string, T>) => Object.fromEntries(Object.entries(map).filter(([id]) => ids.has(id)));
  const next: State = {
    routine,
    week: state.week,
    day: routine?.days.some((d) => d.id === state.day) ? state.day : (routine?.days[0]?.id ?? ""),
    checks: keep(state.checks),
    weights: keep(state.weights),
    rev: getState(owner).rev + 1,
  };
  store.write(owner, "state", next);
  return next;
}
