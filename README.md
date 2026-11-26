# WakeSet

Build your own weekly workout routine and tick it off as you train.

A routine is days, each day is blocks (warm-up, supersets, circuits), each block is exercises with sets, a suggested weight, a one-line form cue and a "Watch demo" link that searches YouTube for the move. Every part of it can be changed, by hand or by asking Spotter, the assistant.

## Run it

```bash
npm install
npm run dev        # http://localhost:3200
npm run typecheck
npm run build
npm run smoke      # accounts, isolation, saving; needs a fresh build first
```

With nothing configured it runs: each visitor gets a private routine tied to a cookie, and Spotter is off. Settings are in `.env.example`. Set `ANTHROPIC_API_KEY` to switch Spotter on.

## Pages

| Page | What it is for |
|---|---|
| Week | The board. One tab per training day with a progress bar. Tap an exercise to cross it out, log the weight used, open "How to" for the cue and demo link. "Start next week" clears the ticks and keeps the weights. |
| Build | The editor. Add, reorder, duplicate and delete days, blocks and exercises. "Add exercise" opens the library (about 95 moves, filtered by muscle group and equipment) or takes a name you type. |
| Spotter | The assistant. Say what you want ("4 days, dumbbells only, 30 minutes") and he writes or changes the routine. |
| Account | Make an account to keep the routine and open it on other devices. Export or import a routine file. Erase everything. |

A first visit offers starter routines: the home 5-day Upper / Lower / Core plan, a 3-day gym plan, a no-equipment plan, or a blank week.

## How it fits together

- **A feature is three things**, as in Overture and Conduit: a `lib/x.ts` module that reads and writes store documents, some `case` lines in `app/api/[...path]/route.ts`, and a page under `app/`.
- **`lib/types.ts`** is the shape of a routine (zod), shared by the browser, the API and Spotter's tools.
- **`lib/store.ts`** is one SQLite file of JSON documents, each belonging to an owner. The owner always comes from the signed cookie.
- **`lib/auth.ts`**: every visitor has an id in a signed cookie. Making an account attaches an email and password to that id, so what was built as a guest stays.
- **`lib/state.ts`** saves a person's routine, ticks and weights. Each save carries the revision it started from; a save from an out-of-date copy is refused and the browser takes the newer one.
- **`lib/spotter.ts`** runs Claude with three tools (`set_routine`, `set_day`, `remove_day`). The model proposes; the tool schemas check the shape and code does the writing. Messages are capped per person and per site per day.
- **`lib/library.ts`** and **`lib/templates.ts`** are the exercise library and starter routines. Add to them freely.
- **`components/board.tsx`** holds the browser's copy and saves changes a moment after they are made.

## What has and has not been tested

Typecheck, the production build and `npm run smoke` pass. The Week, Build and Account pages have been used in a browser at desktop and phone widths, in light and dark. Spotter has not been run against the real API: no key was available where this was built, so his prompt and tools are untested with a model.

## Not built yet

- Password reset (it needs outgoing email). Until then a forgotten password cannot be recovered.
- Clearing out guests who never come back.
- A history of past weeks. Logged weights carry over; nothing else is kept.

## Deploy

`Dockerfile` builds an image that keeps its database in `/data`; mount a persistent disk there. It needs a host that runs a Node server with a disk (a VM, Fly, Railway, Render). It will not keep data on a serverless host such as Vercel as it stands.
