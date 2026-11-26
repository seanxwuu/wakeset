import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { LIBRARY } from "./library";
import { getState, save } from "./state";
import * as store from "./store";
import { ASSISTANT, DayInput, RoutineInput, withIds, type Routine, type State } from "./types";

// Spotter: the assistant. He reads the person's routine and changes it
// through three tools. The model proposes a routine; code checks its shape
// (zod, via the tool schemas) and is the only thing that writes it.
const MODEL = process.env.WAKESET_MODEL || "claude-opus-5-5";
const PER_PERSON = Number(process.env.WAKESET_AI_DAILY || 40);
const PER_SITE = Number(process.env.WAKESET_AI_DAILY_TOTAL || 2000);

export const hasSpotter = () => Boolean(process.env.ANTHROPIC_API_KEY);

const Turn = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) });
const History = z.array(Turn).min(1).max(40);

const RULES = `You are ${ASSISTANT}, the assistant inside WakeSet, a site where a person builds and follows their own weekly workout routine. You are a knowledgeable, plain-spoken training partner.

What the person sees: a board with one tab per training day. Each day has blocks (warm-up, supersets, circuits, cool-down); each block lists exercises with sets, a suggested load, a one-line form cue under "How to", and a "Watch demo" link that searches YouTube for the exercise name. They tick exercises off as they train and log the weight they used.

You change the routine with tools. set_routine replaces the whole week; set_day adds or replaces a single day; remove_day deletes one. When the person asks for a change, make it with a tool rather than describing it, then say in a sentence or two what you changed. Prefer set_day for a change to one day so the rest of the week, and its ticks and logged weights, are untouched. When you replace a day, send the complete day: anything you leave out is removed.

Writing a routine:
- Ask first only when you cannot make a sensible routine without the answer (for a brand-new routine: days per week, equipment, session length and goal, if they have not said). Otherwise choose reasonable defaults and say what you assumed.
- Use only equipment the person has said they have. If you do not know, ask.
- Exercise names should be standard names a YouTube search will find. Use the library names below where one fits; other exercises are fine.
- "sets" is written as it appears on the board: "4 × 8–10", "3 × 45s", "3 × 10 per side", "1 min".
- Give every exercise a cue: one line, the single most useful thing to get the form right.
- Set log to true on weighted moves and give a load range the person can start from; leave both out for bodyweight moves.
- A block with superset true is done back to back before resting; its "how" says the rounds and the rest, e.g. "4 rounds. Rest 60–75s after each round."
- Start each day with a short warm-up block. Keep each session to the length the person asked for.
- When they say something was too much or left them very sore, cut volume first (fewer blocks or rounds), and add it back gradually.
- When asked to write the next week: keep the same days and overall structure, nudge loads up a little where last_logged_lb shows they handled the weight (2.5 to 5 lb, written as a new load range), and trade one or two moves per day for similar ones so the week is not a copy. Do not add volume and weight in the same week.

You are not a doctor. For pain, injury, or a medical condition, suggest they see a professional, and offer a gentler alternative if they want one. Keep replies short and direct: no preamble, no lists of everything in the routine (they can see the board).

Exercise library, by group:
${[...new Set(LIBRARY.map((x) => x.group))].map((g) => `${g}: ${LIBRARY.filter((x) => x.group === g).map((x) => x.name).join("; ")}`).join("\n")}`;

/** The routine as the model sees it: day ids for addressing, the weight last logged on each move, no exercise ids. */
function describe(state: State) {
  const { routine } = state;
  if (!routine) return "The person has no routine yet.";
  const slim = {
    name: routine.name,
    days: routine.days.map((d) => ({
      day_id: d.id, short: d.short, title: d.title, time: d.time, focus: d.focus,
      blocks: d.blocks.map((b) => ({ title: b.title, how: b.how, superset: b.superset, exercises: b.exercises.map(({ id, ...e }) => ({ ...e, ...(state.weights[id] ? { last_logged_lb: state.weights[id] } : {}) })) })),
    })),
  };
  const open = routine.days.find((d) => d.id === state.day);
  return `The person is on week ${state.week}.${open ? ` The day open on their screen is "${open.short}" (day_id ${open.id}); "today" or "this session" means that day.` : ""} last_logged_lb is the weight they last recorded for a move; it is for your reference and is not a field you set.\nTheir current routine:\n${JSON.stringify(slim)}`;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Counts one message against the person's and the site's daily allowance. */
function spend(owner: string) {
  if (store.bump(store.SYSTEM, `ai:${today()}:all`) > PER_SITE) throw new Error(`${ASSISTANT} has reached today's limit for the whole site. Try again tomorrow.`);
  if (store.bump(store.SYSTEM, `ai:${today()}:${owner}`) > PER_PERSON) throw new Error(`You have reached today's limit of ${PER_PERSON} messages to ${ASSISTANT}. It resets at midnight UTC.`);
}

export async function chat(owner: string, rawHistory: unknown, signal?: AbortSignal): Promise<{ reply: string; changed: boolean }> {
  if (!hasSpotter()) throw new Error(`${ASSISTANT} is not switched on for this site yet.`);
  const history = History.parse(rawHistory);
  if (history.at(-1)!.role !== "user") throw new Error("Nothing to answer.");
  spend(owner);

  let changed = false;
  const apply = (edit: (routine: Routine | null) => RoutineInput) => {
    const state = getState(owner);
    const next = withIds(RoutineInput.parse(edit(state.routine)), state.routine);
    save(owner, { ...state, routine: next });
    changed = true;
    return `Saved. The routine now has ${next.days.length} day${next.days.length === 1 ? "" : "s"}: ${next.days.map((d) => `${d.short} (day_id ${d.id})`).join(", ")}.`;
  };
  /** A day as tool input, so untouched days pass through an edit unchanged. */
  const asInput = (routine: Routine | null): RoutineInput => ({ name: routine?.name || "My routine", days: routine?.days ?? [] });

  const tools = [
    betaZodTool({
      name: "set_routine",
      description: "Replace the person's whole weekly routine. Use for a new routine or a rebuild of the week. Days appear on the board in the order given.",
      inputSchema: z.object({ routine: RoutineInput }),
      run: ({ routine }) => apply(() => routine),
    }),
    betaZodTool({
      name: "set_day",
      description: "Add one training day, or replace an existing one. Pass the day_id of the day to replace; leave day_id out to add a new day at the end. The day you send replaces the old one completely. A week holds at most 7 days.",
      inputSchema: z.object({ day_id: z.string().optional(), day: DayInput }),
      run: ({ day_id, day }) => {
        const routine = getState(owner).routine;
        if (day_id && !routine?.days.some((d) => d.id === day_id)) return `There is no day with day_id ${day_id}. The days are: ${routine?.days.map((d) => `${d.short} (${d.id})`).join(", ") || "none"}.`;
        if (!day_id && (routine?.days.length ?? 0) >= 7) return "The week already has 7 days. Replace or remove one instead.";
        return apply((r) => ({ ...asInput(r), days: day_id ? r!.days.map((d) => (d.id === day_id ? day : d)) : [...(r?.days ?? []), day] }));
      },
    }),
    betaZodTool({
      name: "remove_day",
      description: "Delete one training day from the routine.",
      inputSchema: z.object({ day_id: z.string() }),
      run: ({ day_id }) => {
        const routine = getState(owner).routine;
        if (!routine?.days.some((d) => d.id === day_id)) return `There is no day with day_id ${day_id}.`;
        if (routine.days.length === 1) return "That is the only day. Replace it with set_day instead of removing it.";
        // Saved directly: the other days keep their ids, ticks and logged weights.
        const state = getState(owner);
        save(owner, { ...state, routine: { ...routine, days: routine.days.filter((d) => d.id !== day_id) } });
        changed = true;
        return "Removed.";
      },
    }),
  ];

  const state = getState(owner);
  const client = new Anthropic();
  const message = await client.beta.messages.toolRunner(
    {
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      // If a safety classifier declines a message, the API retries it on the fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: RULES, cache_control: { type: "ephemeral" } },
        { type: "text", text: describe(state) },
      ],
      tools,
      messages: history,
      max_iterations: 8,
    },
    { signal },
  );

  const reply = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  if (message.stop_reason === "refusal") return { reply: reply || `${ASSISTANT} can't help with that one.`, changed };
  return { reply: reply || (changed ? "Done. Your routine is updated." : "I didn't get that. Try again?"), changed };
}

/** A message a person can act on, whatever went wrong talking to the model. */
export function spotterError(error: unknown): string {
  if (error instanceof z.ZodError) return "That message could not be read.";
  if (error instanceof Anthropic.AuthenticationError) return `${ASSISTANT}'s API key was rejected. Check ANTHROPIC_API_KEY.`;
  if (error instanceof Anthropic.RateLimitError) return `${ASSISTANT} is busy right now. Try again in a minute.`;
  if (error instanceof Anthropic.APIConnectionError) return `${ASSISTANT} could not be reached. Try again.`;
  if (error instanceof Anthropic.APIError) return `${ASSISTANT} hit a problem (${error.status ?? "error"}). Try again.`;
  return error instanceof Error ? error.message : "Something went wrong.";
}
