# Spycraft

**Live:** https://tgp-spycraft-teens.netlify.app (organizer view at `/admin.html`).

A one-tap party game. Each player opens the page and taps once to get a secret
role. **Spies see a red screen. Everyone else sees a green screen.** Five spies
are chosen by tap order, and every assignment is saved on the server (Netlify
Blobs) so nobody can re-roll and the organizer can see who the spies are.

## How it works

The spies are the players whose **tap order lands on a Fibonacci number, starting
from the 3rd tap**. The Fibonacci numbers from 3 up are 3, 5, 8, 13, 21, and the
first five of them are the spy slots:

```
tap #:  1  2 [3] 4 [5] 6  7 [8] 9 ... [13] ... [21]
role:   .  .  S  .  S  .  .  S  .       S        S
```

So the **3rd, 5th, 8th, 13th and 21st** people to tap are the spies. Everyone
else is clean. This gives exactly five spies once at least 21 people have tapped.

- **Saved in Netlify:** the tap counter and each player's role live in a Netlify
  Blobs store, so the state survives page reloads and is shared across everyone's
  phones.
- **One role per player, forever:** each device gets a random id (kept in
  `localStorage`) and the server records its role. Reloading shows the same role,
  so no re-rolling.
- **Race-safe:** if a whole group taps at the same instant, the server uses
  conditional writes (etag `onlyIfMatch`) and retries, so every tap gets a clean,
  ordered number and no position is ever used twice.

**Group size (20 to 30 works well).** The 5th spy appears on the 21st tap, so any
group of 21 or more gets all five spies. With exactly 20 people there are four
spies (positions 3, 5, 8, 13); add one more tap for the fifth.

## Files

```
spycraft/
  index.html                     the player page (tap to reveal, red/green screen)
  admin.html                     organizer page: see who is a spy, reset the round
  netlify.toml                   Netlify build + function config
  package.json                   depends on @netlify/blobs
  netlify/functions/
    _game.mjs                    pure deck + assignment logic (unit-tested)
    role.mjs                     POST: assign and save this player's role
    results.mjs                  GET (admin key): the spy list and full roster
    reset.mjs                    POST/GET (admin key): start a fresh round
```

## Deploy to Netlify

1. **Create a site from this folder.** In the Netlify dashboard, add a new site
   from this Git repo. Set the site's **base directory** to `spycraft` (so
   `netlify.toml`, `package.json`, and the functions are found). Netlify Blobs
   needs no setup, it is on by default.

2. **Set the number of players and the admin key** under
   Site settings, Environment variables:

   | Variable | Meaning | Default |
   | --- | --- | --- |
   | `SPYCRAFT_SPIES` | How many spies (how many Fibonacci positions to use). | `5` |
   | `SPYCRAFT_ADMIN_KEY` | A secret you choose. Needed to view the spy list or reset. | none |
   | `SPYCRAFT_GAME_ID` | Change this to force a brand new game. | `default` |

3. **Deploy.** Netlify installs `@netlify/blobs` and publishes the functions
   automatically.

That's it. Share the site URL with the players.

## Running the game

- **Players:** open the site, enter their **first name and email** (both required),
  then tap **Reveal my role**. The screen flashes bright and turns red for a spy or
  green for a clean player. Name, email and role are saved to Netlify. They tap
  **Hide** and pass the phone on. The reveal goes full screen and holds a screen
  wake lock so the phone stays bright and does not dim.
- **Organizer:** open `/admin.html`, enter your `SPYCRAFT_ADMIN_KEY`, and tap
  **Show spies** to see exactly who the 5 spies are and the full roster with times.
- **New round:** on the admin page tap **Reset round** (or bump
  `SPYCRAFT_GAME_ID`). The tap counter resets and a fresh game begins.

Notes:

- Roles are decided purely by tap order (positions 3, 5, 8, 13, 21), so the order
  people tap in is what matters. Ask everyone to tap around the same time.
- With 21 or more players you get all five spies. With exactly 20 you get four
  (the 21st position is never reached), so one extra tap gives the fifth spy.

## Local development

```bash
npm install
npx netlify dev        # serves the page and functions, with local Blobs
```

Run the logic tests (no Netlify needed):

```bash
node --input-type=module -e "import('./netlify/functions/_game.mjs').then(g => { \
  const s = g.initState({gameId:'t', spies:5}); \
  for (let i=0;i<25;i++) g.assign(s,'p'+i,'N'+i); \
  const spies = Object.entries(s.assignments).filter(([,a])=>a.role==='spy').map(([,a])=>a.clickIndex); \
  console.log('spy tap positions:', spies.sort((x,y)=>x-y)); })"
```
