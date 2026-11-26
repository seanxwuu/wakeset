// The built-in exercise library: what the "Add exercise" picker offers and
// what Spotter knows by name. Anything not here can be typed in as a custom
// exercise. `sets` is only the starting suggestion.
export type LibraryItem = { name: string; group: string; gear: string; sets: string; cue: string; log?: boolean };

export const GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Glutes & hamstrings", "Core", "Conditioning", "Warm-up & mobility"] as const;
export const GEAR = ["Bodyweight", "Dumbbells", "Barbell", "Kettlebell", "Bands", "Machine or cable", "Pull-up bar", "Push-up board"] as const;

const L = (group: string, gear: string, rows: [name: string, sets: string, cue: string][]): LibraryItem[] =>
  rows.map(([name, sets, cue]) => ({ name, group, gear, sets, cue, log: !["Bodyweight", "Push-up board", "Pull-up bar"].includes(gear) || undefined }));

export const LIBRARY: LibraryItem[] = [
  ...L("Chest", "Dumbbells", [
    ["DB floor press", "4 × 8–10", "Lie on the floor, knees bent. Lower until your upper arms touch the floor, then press."],
    ["DB bench press", "4 × 8–10", "Shoulder blades pinched, lower the DBs to chest level, press up and slightly in."],
    ["DB incline press", "3 × 8–12", "Bench at about 30°, lower to the upper chest, elbows at 45°."],
    ["DB chest fly", "3 × 12–15", "Slight bend in the elbows, open wide until you feel a stretch, hug back up."],
    ["DB pullover", "3 × 12", "DB over chest, lower it behind your head with slightly bent arms, pull back over."],
  ]),
  ...L("Chest", "Barbell", [
    ["Barbell bench press", "4 × 5–8", "Feet planted, bar to the lower chest, elbows at about 45°, press back over the shoulders."],
    ["Incline barbell press", "3 × 8–10", "Bar to the upper chest, wrists stacked over elbows."],
  ]),
  ...L("Chest", "Bodyweight", [
    ["Push-ups", "3 × max, stop 2 short", "Body in one straight line, elbows at about 45°, chest to the floor."],
    ["Incline push-ups", "3 × 12", "Hands on a bench or couch. The easier push-up; same straight line."],
    ["Decline push-ups", "3 × 10", "Feet on a chair. Hits the upper chest and shoulders harder."],
    ["Dips", "3 × 8–12", "Lean slightly forward, lower until upper arms are parallel, press up."],
  ]),
  ...L("Chest", "Push-up board", [["Board push-ups", "4 × max, stop 2 short", "Hands in the slots for the muscle you want, body in one straight line, chest down to the board."]]),
  ...L("Chest", "Machine or cable", [["Cable fly", "3 × 12–15", "Step forward, slight bend in the elbows, bring your hands together in front of your chest."]]),

  ...L("Back", "Dumbbells", [
    ["Bent-over DB row", "3 × 10–12", "Hinge to about 45°, pull the DBs to your hips, squeeze shoulder blades."],
    ["One-arm DB row", "4 × 10 per side", "One hand and knee on a chair or bench, pull the DB to your hip."],
    ["DB renegade row", "3 × 8 per side", "Plank on the DBs, feet wide, row one side without your hips rotating."],
    ["DB reverse fly", "3 × 12–15", "Hinge forward, raise arms out wide like wings, squeeze upper back."],
    ["DB shrug", "3 × 12–15", "Shrug straight up toward your ears, pause, no rolling."],
  ]),
  ...L("Back", "Barbell", [
    ["Barbell row", "4 × 6–10", "Hinge with a flat back, pull the bar to your lower ribs, lower under control."],
    ["Deadlift", "3 × 5", "Bar over mid-foot, flat back, push the floor away and stand tall."],
  ]),
  ...L("Back", "Pull-up bar", [
    ["Pull-ups", "4 × max, stop 1 short", "Start from a dead hang, pull your chest to the bar, lower all the way."],
    ["Chin-ups", "3 × max, stop 1 short", "Palms facing you, shoulder width, chin over the bar."],
    ["Dead hang", "3 × 30s", "Hang with shoulders pulled slightly down, breathe."],
  ]),
  ...L("Back", "Machine or cable", [
    ["Lat pulldown", "3 × 10–12", "Lean back slightly, pull the bar to your upper chest, elbows down and back."],
    ["Seated cable row", "3 × 10–12", "Sit tall, pull to your stomach, squeeze shoulder blades, don't rock."],
    ["Face pull", "3 × 15", "Rope to eye level, elbows high, pull apart at the end."],
  ]),
  ...L("Back", "Bands", [["Band pull-apart", "3 × 15–20", "Arms straight in front, pull the band wide and squeeze shoulder blades."]]),

  ...L("Shoulders", "Dumbbells", [
    ["DB overhead press", "3 × 8–10", "Press straight up, keep ribs down, head comes through at the top."],
    ["DB Arnold press", "3 × 10", "Start palms facing you, rotate them outward as you press up."],
    ["DB lateral raise", "3 × 12–15", "Slight bend in elbows, raise to shoulder height, lead with elbows."],
    ["DB front raise", "3 × 12", "Raise to eye level with straight arms, no swinging."],
    ["DB push press", "3 × 8", "Quick dip with your knees, then drive the DBs overhead."],
  ]),
  ...L("Shoulders", "Barbell", [["Overhead press", "4 × 5–8", "Squeeze glutes, press the bar straight up, head through at the top."]]),
  ...L("Shoulders", "Bodyweight", [["Pike push-ups", "3 × 8–10", "Hips high in an upside-down V, lower your head toward the floor."]]),

  ...L("Arms", "Dumbbells", [
    ["DB biceps curl", "3 × 10–12", "Keep elbows tight to your sides, no swinging."],
    ["DB hammer curl", "3 × 10–12", "Palms facing each other, no swinging."],
    ["DB skull crusher", "3 × 10–12", "Lie down, lower the DBs toward your forehead, elbows stay pointed up."],
    ["DB overhead triceps extension", "3 × 12", "One DB in both hands, lower it behind your head, elbows close to your ears."],
    ["DB triceps kickback", "3 × 12–15", "Hinge forward, upper arm still, straighten the elbow fully."],
  ]),
  ...L("Arms", "Barbell", [["Barbell curl", "3 × 8–12", "Elbows by your sides, curl without leaning back."]]),
  ...L("Arms", "Machine or cable", [["Triceps pushdown", "3 × 12–15", "Elbows pinned to your sides, straighten fully, control the way up."]]),
  ...L("Arms", "Bodyweight", [
    ["Close-grip push-ups", "3 × max, stop 2 short", "Hands under shoulders, elbows brush your ribs."],
    ["Bench dips", "3 × 12", "Hands on a chair behind you, lower until elbows reach 90°."],
  ]),

  ...L("Legs", "Dumbbells", [
    ["DB goblet squat", "4 × 10", "Hold one DB at your chest, sit down between your heels, elbows inside knees."],
    ["DB reverse lunge", "4 × 8 per side", "Step back, front shin stays vertical, push up through the front heel."],
    ["DB walking lunge", "3 × 10 per side", "Long steps, torso tall."],
    ["DB step-up", "3 × 8 per side", "Whole foot on the step, drive through that heel, don't push off the back foot."],
    ["DB Bulgarian split squat", "3 × 8–10 per side", "Back foot on a couch or chair, drop the back knee straight down."],
    ["DB sumo squat", "4 × 10", "Wide stance, toes out, one DB hangs between your legs."],
    ["DB calf raise", "3 × 15", "Rise high on your toes, pause, lower slowly."],
    ["DB thruster", "3 × 10", "Squat with DBs at shoulders, then drive straight into an overhead press."],
  ]),
  ...L("Legs", "Barbell", [
    ["Back squat", "4 × 5–8", "Bar on the upper back, brace, sit down and back, knees track over toes."],
    ["Front squat", "3 × 6–8", "Bar on the front of the shoulders, elbows high, torso upright."],
  ]),
  ...L("Legs", "Machine or cable", [
    ["Leg press", "3 × 10–12", "Feet shoulder width, lower until knees reach 90°, don't lock out hard."],
    ["Leg extension", "3 × 12–15", "Straighten fully, pause, lower slowly."],
    ["Leg curl", "3 × 12–15", "Curl all the way, hips stay down."],
  ]),
  ...L("Legs", "Bodyweight", [
    ["Bodyweight squats", "3 × 15", "Sit back, chest up."],
    ["Reverse lunges", "3 × 8 per side", "Step back, back knee drops toward the floor."],
    ["Side lunges", "3 × 8 per side", "Step wide, sit into one hip, keep the other leg straight."],
    ["Jump squats", "3 × 10", "Land softly and sink straight into the next rep."],
    ["Wall sit", "3 × 45s", "Back flat on the wall, knees at 90°."],
  ]),

  ...L("Glutes & hamstrings", "Dumbbells", [
    ["DB Romanian deadlift", "3 × 10", "Soft knees, push hips back, DBs slide down your thighs, back flat."],
    ["DB hip thrust", "3 × 12", "Upper back on the couch edge, DB on hips, drive up and squeeze."],
    ["DB single-leg Romanian deadlift", "3 × 8 per side", "DB on the working side, other hand on a wall for balance."],
    ["DB two-hand swing", "4 × 15", "Hinge and snap your hips forward; arms just guide the DB to chest height."],
  ]),
  ...L("Glutes & hamstrings", "Barbell", [
    ["Romanian deadlift", "3 × 8", "Soft knees, hips back, bar stays against your legs, back flat."],
    ["Barbell hip thrust", "3 × 8–12", "Upper back on a bench, bar on hips, drive up and squeeze at the top."],
  ]),
  ...L("Glutes & hamstrings", "Kettlebell", [["Kettlebell swing", "4 × 15", "Hinge, hike the bell back, snap your hips; it floats to chest height."]]),
  ...L("Glutes & hamstrings", "Bodyweight", [
    ["Glute bridges", "3 × 15", "Drive through heels, squeeze glutes at the top."],
    ["Single-leg glute bridge", "3 × 10 per side", "One foot down, other leg straight, hips level."],
    ["Good mornings, bodyweight", "1 × 12", "Hands behind head, push hips back, back flat."],
  ]),

  ...L("Core", "Bodyweight", [
    ["Plank", "3 × 45s", "Straight line head to heels, squeeze glutes, brace like you're about to take a punch."],
    ["Side plank", "3 × 30s per side", "Forearm down, hips up, straight line."],
    ["Dead bug", "3 × 10 per side", "Lower back pressed into the floor, extend opposite arm and leg."],
    ["Bicycle crunch", "3 × 20 total", "Rotate your shoulders, not just your elbows; slow beats fast."],
    ["Leg raises", "3 × 10–12", "Lower back stays down, lower your legs slowly."],
    ["Hollow hold", "3 × 30s", "Lower back pressed down, arms and legs long and low."],
    ["Bird dog", "3 × 10 per side", "Reach opposite arm and leg, hips square to the floor."],
  ]),
  ...L("Core", "Dumbbells", [
    ["DB Russian twist", "3 × 20 total", "Lean back slightly, rotate your shoulders, not just your arms."],
    ["DB suitcase side bend", "3 × 12 per side", "DB in one hand, lean toward it and come back up without twisting."],
    ["DB weighted crunch", "3 × 15", "DB on your chest, curl ribs toward hips."],
    ["DB farmer carry", "3 × 40s", "Heavy DB in each hand, walk tall, shoulders down."],
  ]),
  ...L("Core", "Pull-up bar", [["Hanging knee raise", "3 × 10–12", "No swinging; curl your knees up toward your chest."]]),

  ...L("Conditioning", "Bodyweight", [
    ["Mountain climbers", "4 × 40s", "Hands under shoulders, drive knees to chest fast."],
    ["Burpees", "4 × 10", "Chest to the floor, jump up, land softly."],
    ["High knees", "4 × 30s", "Knees to hip height, quick feet."],
    ["Jumping jacks", "3 × 45s", "Light on your feet, full arm swing."],
    ["Jump rope", "5 × 60s", "Small jumps, wrists turn the rope."],
  ]),

  ...L("Warm-up & mobility", "Bodyweight", [
    ["Arm circles + shoulder rolls", "1 min", "Small to big circles, both directions."],
    ["Cat-cow + hip circles", "1 min", "Slowly arch and round your back with your breath."],
    ["World's greatest stretch", "5 per side", "Lunge, elbow to instep, rotate and reach to the ceiling."],
    ["Child's pose + cobra stretch", "3 min", "Breathe slowly, 30–60s in each stretch."],
    ["Hip flexor stretch", "45s per side", "Half kneeling, tuck your pelvis, lean gently forward."],
    ["Easy walk or jog", "5 min", "Just enough to get warm."],
  ]),
];

const byName = new Map(LIBRARY.map((x) => [x.name.toLowerCase(), x]));
/** The library's cue for a move, matching on the name before any comma or bracket. */
export const cueFor = (name: string) => byName.get(name.toLowerCase())?.cue ?? byName.get(name.replace(/\(.*?\)|,.*$/g, "").trim().toLowerCase())?.cue;
