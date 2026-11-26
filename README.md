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

Written for a small Linux VM (Debian 12, 1 GB of memory is enough) with ports 80 and 443 open. Docker runs the app and Caddy, which gets and renews the HTTPS certificate. It needs a persistent disk, so it will not keep data on a serverless host such as Vercel.

1. Create a name at duckdns.org (say `wakeset`) and copy your token from the top of that page.
2. On the VM:

```bash
sudo apt-get update && sudo apt-get install -y git
```

```bash
git clone https://github.com/seanxwuu/wakeset.git && cd wakeset
```

```bash
sudo SITE_ADDRESS=wakeset.duckdns.org DUCKDNS_TOKEN=your-token bash deploy/setup-vm.sh
```

The script adds swap, installs Docker, points the DuckDNS name at the machine (and keeps it pointed there every five minutes), writes `deploy/.env` with a generated secret, builds and starts the site, and schedules a nightly backup. The first build takes 5 to 15 minutes. With a fixed public address you can leave `DUCKDNS_TOKEN` out and set the address on duckdns.org by hand.

| To | Run |
|---|---|
| Switch Spotter on | Put the key in `deploy/.env` as `ANTHROPIC_API_KEY=...`, then `cd deploy && sudo docker compose up -d` |
| Update to the latest code | `sudo bash deploy/update.sh` |
| Back up now | `sudo bash deploy/backup.sh` (also runs nightly, newest 14 kept) |
| List or restore backups | `sudo bash deploy/restore.sh`, then `sudo bash deploy/restore.sh latest` |

Backups sit on the same disk as the database. They cover a bad update or a mistake, not a lost disk; for that, turn on scheduled disk snapshots in the cloud console.

**Fast updates.** Every merge builds the app on GitHub (`.github/workflows/image.yml`) so the server can download it in about a minute instead of building it. For the server to be allowed to download it, make the package public once: on GitHub, open the repo's Packages, choose `wakeset`, Package settings, Change visibility, Public. Until then `update.sh` falls back to building on the server, which works but is slow.

The deploy scripts have been checked for syntax and the backup and restore tool has been run against a real database, but the Docker build and `setup-vm.sh` have not been run on a VM yet.
