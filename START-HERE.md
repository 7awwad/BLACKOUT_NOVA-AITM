# BLACKOUT Round 2 - team handover

This project contains the latest complete project source, including Sea Battle,
Chameleon Hunt, riddle mode, organiser controls, team links, QR hunt and call
verification. Exported from commit e6c0078e81031ded7a793f2d6d55a7c343660099.

## Run on your computer

1. Install Node.js 22.13 or newer (a supported LTS release is recommended).
2. Clone this repository and open a terminal in the folder containing package.json.
3. Install dependencies:

   npm run install:ci

4. Build once to generate the local Cloudflare configuration:

   npm run build

5. Create the local database (run once on a fresh extracted project):

   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_warm_madripoor.sql

6. Start the development application:

   npm run dev

7. Open http://127.0.0.1:5173 in your browser. For local organiser sign-in, open:

   http://127.0.0.1:5173/signin-with-chatgpt?return_to=/

   The starter provides a simulated local identity for loopback development.
   On Windows PowerShell, use npm.cmd instead of npm if script execution is blocked.
   Internet access is required for dependency installation.

## Try the games

- Create a practice mission with 2 teams for a quick rehearsal, or 8 teams for
  four independent head-to-head matches.
- Before starting, open Round setup, choose Sea Battle or Chameleon Hunt,
  check pairings, then Save mini games. Each mission selects one mode.
- Start mini games and use Pass & play for a shared-device duel, or private
  team links in separate browser tabs for development checks.
- Sea Battle: deploy five ships, Ready, then one normal shot per turn.
- Chameleon Hunt: one team places, paints and poses three figures, then the
  other hunts them. Roles swap; the higher total hunting score wins.
- BLACKOUT interrupts mini games and opens the physical QR hunt.
- Print the three mission QR codes, hide them, and let teams collect the
  3+3+4 number fragments, arrange the number, and make the actual phone call.
- The organiser confirms the first winning call manually.
- Mini-game victories do not automatically award JAM or other abilities.

## Working together

Each extracted copy uses its own local database. Opening separate copies on
separate computers does not connect their matches. The current hosted site is:
https://blackout-round-two.azurevole256.chatgpt.site/
Its existing access rules still apply; this ZIP does not grant hosted access.
Use one shared deployed backend for the actual multi-device event. The local
sign-in emulator is restricted to loopback development. For deployment outside
Sites, configure your own hosting, Cloudflare D1 binding and trusted server-side
organiser authentication; the production app expects hosting-provided identity.
Do not expose a publicly spoofable identity-header bypass.

## Useful project files

- app/console.tsx: organiser and player interface
- app/round-setup.tsx: mini-game selection and pairings
- app/sea-battle.ts and app/sea-battle-panel.tsx: Sea Battle rules and interface
- app/chameleon.ts, app/chameleon-scene.ts and app/chameleon-panel.tsx:
  original Chameleon Hunt rules, arena and interface
- app/sea-pass-play.tsx: shared-device handover for both games
- app/game.ts: mission, riddle, QR and call-verification rules
- app/api/game/route.ts: authoritative API and mission persistence
- drizzle/: database migration
- scripts/test-*.mjs: game, rendering and API checks
- README.md: additional technical notes and game rules

Chameleon Hunt is an original fixed-camera browser adaptation inspired by
paint-and-hide gameplay; it does not contain the commercial Meccha Chameleon game.

## Validation commands

Run pure rule/render checks from the project directory:

   node scripts/test-game.mjs
   node scripts/test-sea-battle.mjs
   node scripts/test-sea-render.mjs
   node scripts/test-chameleon.mjs
   node scripts/test-chameleon-render.mjs
   node node_modules/typescript/bin/tsc --noEmit

With the dev server running on port 5173 and the local database initialized:

   node scripts/test-api.mjs
   node scripts/test-sea-api.mjs
   node scripts/test-chameleon-api.mjs

API tests create rehearsal missions in the local database only.

## What is included

All tracked source, dependency lockfile, configuration, migrations and tests.
Dependencies (node_modules), compiled output, Git history, runtime caches,
local database contents and credentials are excluded. This is a source export,
not an export of production mission/team records. Existing source licenses
and vendored attribution files are preserved.