# BLACKOUT - Round 2

A competitive college-event web application with an organiser dashboard, two-team mini games, a physical QR hunt and a final winning phone call.

## Mini games

- **Sea Battle:** five hidden ships, one normal shot per turn, two teams per duel.
- **Chameleon Hunt:** paint, pose and hide three figures; opponents find them, then roles swap. An original browser adaptation.
- **Riddle & logic:** the existing puzzle mode remains available.

Eight teams play four independent duels. Select one mode per mission before starting. The organiser can pause the round or trigger BLACKOUT to open the QR hunt. Three clues split the final phone number into **3 + 3 + 4** digits. The organiser confirms the winning real phone call manually.

## Run the project

Read **[START-HERE.md](START-HERE.md)** for installation, local sign-in, database setup, game instructions and validation commands.

Requires **Node.js 22.13 or newer**. Install dependencies, build once and initialize the database as described in the guide, then run `npm run dev`.

## Stack

React 19, TypeScript, Vinext/Vite, Cloudflare Workers, D1 and Drizzle. Gameplay validation and state updates run on the server.

## Documentation

- [Team setup and handover](START-HERE.md)
- [Technical notes, game rules and tests](docs/TECHNICAL-NOTES.md)

Exported from source commit `e6c0078e81031ded7a793f2d6d55a7c343660099`.

Dependencies, credentials, runtime caches and production mission records are excluded. Existing vendored licenses and attribution files are preserved.