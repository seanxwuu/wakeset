import { cueFor } from "./library";
import type { RoutineInput } from "./types";

// Starter routines. Picking one copies it into the person's own routine,
// where every part of it can be changed.
type Ex = RoutineInput["days"][number]["blocks"][number]["exercises"][number];
type Blk = RoutineInput["days"][number]["blocks"][number];

/** name, sets, then optional load (which also switches on weight logging), tag and cue. */
const x = (name: string, sets: string, load?: string, more: { tag?: string; cue?: string; log?: boolean } = {}): Ex => ({
  name, sets,
  ...(load ? { load } : {}),
  ...(more.tag ? { tag: more.tag } : {}),
  cue: more.cue ?? cueFor(name) ?? "",
  ...((more.log ?? Boolean(load)) ? { log: true } : {}),
});
const plain = (title: string, how: string, ...exercises: Ex[]): Blk => ({ title, how, superset: false, exercises });
const together = (title: string, how: string, ...exercises: Ex[]): Blk => ({ title, how, superset: true, exercises });
const chest = { tag: "Chest position" };
const back = { tag: "Back position" };

export type Template = { id: string; title: string; summary: string; gear: string; routine: RoutineInput };

export const TEMPLATES: Template[] = [
  {
    id: "home-5",
    title: "Home 5-day: Upper / Lower / Core",
    summary: "Fat loss while keeping muscle. Two supersets a day, about 30 minutes.",
    gear: "Two adjustable dumbbells, push-up board",
    routine: {
      name: "Home 5-day",
      days: [
        {
          short: "Upper A", title: "Upper A: push focus", time: "~30 min",
          focus: "Chest and triceps lead today, with rows and lateral raises for balance.",
          blocks: [
            plain("Warm-up", "5 minutes, easy pace.",
              x("Arm circles + shoulder rolls", "1 min"),
              x("Board push-ups", "1 × 10 easy", "", { ...chest, cue: "Hands in the chest slots, body in one straight line." }),
              x("Light DB overhead press", "1 × 12", "10 lb", { log: false, cue: "Press straight up, keep ribs down." })),
            together("Superset A", "4 rounds. Rest 60–75s after each round.",
              x("DB floor press", "4 × 8–10", "30–45 lb"),
              x("Board push-ups", "4 × max, stop 2 short", "", { ...chest, cue: "Elbows at about 45°, chest down to the board." })),
            together("Superset B", "3 rounds. Rest 45–60s.",
              x("Bent-over DB row", "3 × 10–12", "30–45 lb"),
              x("DB lateral raise", "3 × 12–15", "10–15 lb")),
          ],
        },
        {
          short: "Lower A", title: "Lower A: squat focus", time: "~30 min",
          focus: "Quads, glutes, and hamstrings.",
          blocks: [
            plain("Warm-up", "5 minutes.", x("Bodyweight squats", "1 × 15"), x("Reverse lunges", "1 × 8 per side"), x("Glute bridges", "1 × 15")),
            together("Superset A", "4 rounds. Rest 75s.",
              x("DB goblet squat", "4 × 10", "35–50 lb (one DB)"),
              x("DB reverse lunge", "4 × 8 per side", "20–35 lb each")),
            together("Superset B", "3 rounds. Rest 60s.",
              x("DB Romanian deadlift", "3 × 10", "30–50 lb each"),
              x("DB step-up (chair or stair)", "3 × 8 per side", "15–30 lb each")),
          ],
        },
        {
          short: "Core", title: "Core + conditioning", time: "~40 min",
          focus: "Core strength first, then a full-body circuit. Keep weights moderate and move with control.",
          blocks: [
            plain("Warm-up", "4 minutes.",
              x("Cat-cow + hip circles", "1 min"),
              x("Board plank, hands on handles", "1 × 30s", "", { ...chest, cue: "Straight line head to heels, squeeze glutes." })),
            together("Core circuit", "3 rounds. Move station to station, rest 60s after the round.",
              x("DB dead bug (hold DB overhead)", "3 × 10 per side", "5–15 lb", { cue: "Lower back pressed into the floor, extend opposite arm and leg." }),
              x("DB Russian twist", "3 × 20 total", "15–25 lb"),
              x("Board plank", "3 × 45s", "", { ...chest, cue: "Brace your stomach like you're about to take a punch." }),
              x("DB suitcase side bend", "3 × 12 per side", "25–40 lb")),
            together("Conditioning circuit", "4 rounds: 40s work, 20s rest each move. Rest 60s between rounds.",
              x("DB renegade row", "4 × 40s", "15–25 lb each"),
              x("DB two-hand swing", "4 × 40s", "25–40 lb (one DB)"),
              x("Mountain climbers on board", "4 × 40s", "", { ...chest, cue: "Hands on the handles, drive knees to chest fast." }),
              x("DB push press", "4 × 40s", "15–25 lb each")),
            plain("Cool-down", "3 minutes.", x("Child's pose + cobra stretch", "3 min")),
          ],
        },
        {
          short: "Upper B", title: "Upper B: pull focus", time: "~30 min",
          focus: "Back and rear shoulders, with board work for chest.",
          blocks: [
            plain("Warm-up", "5 minutes.",
              x("Arm circles + band-free pull-aparts", "1 min", "", { cue: "Arms straight in front, pull them wide and squeeze shoulder blades." }),
              x("Light bent-over DB row", "1 × 12", "15–20 lb", { log: false, cue: "Hinge forward, pull to hips." }),
              x("Board push-ups", "1 × 10 easy", "", { ...back, cue: "Hands in the back slots, squeeze shoulder blades together at the bottom." })),
            together("Superset A", "4 rounds. Rest 60–75s.",
              x("One-arm DB row", "4 × 10 per side", "35–50 lb"),
              x("Board push-ups", "4 × max, stop 2 short", "", { ...back, cue: "Back slots, squeeze shoulder blades as you lower." })),
            together("Superset B", "3 rounds. Rest 60s.",
              x("DB Arnold press", "3 × 10", "15–25 lb"),
              x("DB reverse fly (bent over)", "3 × 12–15", "10–15 lb")),
          ],
        },
        {
          short: "Lower B", title: "Lower B: hinge focus", time: "~30 min",
          focus: "Hamstrings, glutes, and single-leg work.",
          blocks: [
            plain("Warm-up", "5 minutes.", x("Good mornings, bodyweight", "1 × 12"), x("Glute bridges", "1 × 15"), x("Side lunges", "1 × 8 per side")),
            together("Superset A", "4 rounds. Rest 75s.",
              x("DB Romanian deadlift, heavy", "4 × 8", "40–50 lb each", { cue: "Slow on the way down. Back stays flat." }),
              x("DB sumo squat", "4 × 10", "40–50 lb (one DB)")),
            together("Superset B", "3 rounds. Rest 60s.",
              x("DB Bulgarian split squat", "3 × 8–10 per side", "15–30 lb each"),
              x("DB hip thrust", "3 × 12", "35–50 lb")),
          ],
        },
      ],
    },
  },
  {
    id: "gym-3",
    title: "Gym 3-day: full body",
    summary: "Three strength sessions a week built on the big barbell lifts. About 50 minutes.",
    gear: "Barbell, rack, bench, pull-up bar",
    routine: {
      name: "Full body 3-day",
      days: [
        {
          short: "Full A", title: "Full body A: squat + press", time: "~50 min", focus: "Heavy squat and bench, with rows to balance the pressing.",
          blocks: [
            plain("Warm-up", "5 minutes, then two lighter sets of the first lift.", x("Easy walk or jog", "5 min"), x("World's greatest stretch", "5 per side")),
            plain("Strength", "Rest 2–3 min between sets.", x("Back squat", "4 × 5–8", "start light, add 5 lb a week"), x("Barbell bench press", "4 × 5–8", "start light, add 5 lb a week")),
            together("Superset", "3 rounds. Rest 60–90s.", x("Barbell row", "3 × 8–10", "moderate"), x("Plank", "3 × 45s")),
          ],
        },
        {
          short: "Full B", title: "Full body B: hinge + pull", time: "~50 min", focus: "Deadlift and overhead press, with pull-ups and single-leg work.",
          blocks: [
            plain("Warm-up", "5 minutes, then two lighter sets of the first lift.", x("Easy walk or jog", "5 min"), x("Cat-cow + hip circles", "1 min")),
            plain("Strength", "Rest 2–3 min between sets.", x("Deadlift", "3 × 5", "start light, add 5–10 lb a week"), x("Overhead press", "4 × 5–8", "start light, add 2.5 lb a week")),
            together("Superset", "3 rounds. Rest 60–90s.", x("Pull-ups", "3 × max, stop 1 short"), x("DB reverse lunge", "3 × 8 per side", "moderate")),
          ],
        },
        {
          short: "Full C", title: "Full body C: volume", time: "~50 min", focus: "Lighter loads, more reps, and the smaller muscles the first two days skip.",
          blocks: [
            plain("Warm-up", "5 minutes.", x("Easy walk or jog", "5 min"), x("Arm circles + shoulder rolls", "1 min")),
            plain("Strength", "Rest 90s–2 min between sets.", x("Front squat", "3 × 6–8", "moderate"), x("Incline barbell press", "3 × 8–10", "moderate"), x("Romanian deadlift", "3 × 8", "moderate")),
            together("Superset", "3 rounds. Rest 60s.", x("Lat pulldown", "3 × 10–12", "moderate"), x("DB lateral raise", "3 × 12–15", "light"), x("Hanging knee raise", "3 × 10–12")),
          ],
        },
      ],
    },
  },
  {
    id: "bodyweight-3",
    title: "No equipment 3-day",
    summary: "Circuits you can do in a living room. About 25 minutes.",
    gear: "None",
    routine: {
      name: "No equipment 3-day",
      days: [
        {
          short: "Push + legs", title: "Push + legs", time: "~25 min", focus: "Push-ups and squats, done as circuits to keep your heart rate up.",
          blocks: [
            plain("Warm-up", "3 minutes.", x("Jumping jacks", "1 × 45s"), x("Arm circles + shoulder rolls", "1 min")),
            together("Circuit A", "4 rounds. Rest 60s after each round.", x("Push-ups", "4 × max, stop 2 short"), x("Bodyweight squats", "4 × 15"), x("Pike push-ups", "4 × 8")),
            together("Circuit B", "3 rounds. Rest 45s.", x("Reverse lunges", "3 × 10 per side"), x("Bench dips", "3 × 12"), x("Wall sit", "3 × 45s")),
          ],
        },
        {
          short: "Core + cardio", title: "Core + conditioning", time: "~25 min", focus: "Core first while you're fresh, then intervals.",
          blocks: [
            plain("Warm-up", "3 minutes.", x("Cat-cow + hip circles", "1 min"), x("High knees", "2 × 30s")),
            together("Core circuit", "3 rounds. Rest 45s after each round.", x("Dead bug", "3 × 10 per side"), x("Side plank", "3 × 30s per side"), x("Leg raises", "3 × 10–12"), x("Bicycle crunch", "3 × 20 total")),
            together("Intervals", "4 rounds: 30s work, 30s rest each move.", x("Mountain climbers", "4 × 30s"), x("Jump squats", "4 × 30s"), x("Burpees", "4 × 30s")),
          ],
        },
        {
          short: "Glutes + back", title: "Glutes + back", time: "~25 min", focus: "The back of the body: glutes, hamstrings and the muscles that hold your posture.",
          blocks: [
            plain("Warm-up", "3 minutes.", x("Good mornings, bodyweight", "1 × 12"), x("World's greatest stretch", "5 per side")),
            together("Circuit A", "4 rounds. Rest 60s.", x("Single-leg glute bridge", "4 × 10 per side"), x("Side lunges", "4 × 8 per side"), x("Bird dog", "4 × 10 per side")),
            together("Circuit B", "3 rounds. Rest 45s.", x("Glute bridges", "3 × 20"), x("Plank", "3 × 45s"), x("Close-grip push-ups", "3 × max, stop 2 short")),
            plain("Cool-down", "3 minutes.", x("Child's pose + cobra stretch", "3 min")),
          ],
        },
      ],
    },
  },
];

export const BLANK: RoutineInput = {
  name: "My routine",
  days: [{ short: "Day 1", title: "Day 1", time: "~30 min", focus: "", blocks: [{ title: "Warm-up", how: "5 minutes.", superset: false, exercises: [] }] }],
};
