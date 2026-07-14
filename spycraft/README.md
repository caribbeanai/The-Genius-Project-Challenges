# Spycraft

A one-tap party game. Each player opens the page and taps once to get a secret
role. **Spies see a red screen. Everyone else sees a green screen.** Exactly
**5 spies** are chosen at random from the group, and every assignment is saved
on the server (Netlify Blobs) so nobody can re-roll and the organizer can see
who the spies are.

## How it works

The trick that guarantees "exactly 5 spies, chosen at random" is a **deck**.
When the first player taps, the server builds a deck of `N` cards with exactly
5 marked `spy`, shuffles it, and saves it. Every player who taps is dealt the
next card in order. Because the deck is fixed and shuffled once, the spies are
random and there are always exactly five (as long as at least 5 players play).

- **Saved in Netlify:** the deck, who has been dealt in, and each player's role
  live in a Netlify Blobs store, so the state survives page reloads and is shared
  across everyone's phones.
- **One role per player, forever:** each device gets a random id (kept in
  `localStorage`) and the server records its role. Reloading shows the same role,
  so no re-rolling.
- **Race-safe:** if a whole group taps at the same instant, the server uses
  conditional writes (etag `onlyIfMatch`) and retries, so two players can never be
  dealt the same card and you never end up with 4 or 6 spies.

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
   | `SPYCRAFT_TOTAL_PLAYERS` | How many people are playing. **Set this to your group size** so all cards get dealt and exactly 5 are spies. | `20` |
   | `SPYCRAFT_SPIES` | How many spies. | `5` |
   | `SPYCRAFT_ADMIN_KEY` | A secret you choose. Needed to view the spy list or reset. | none |
   | `SPYCRAFT_GAME_ID` | Change this to force a brand new game. | `default` |

3. **Deploy.** Netlify installs `@netlify/blobs` and publishes the functions
   automatically.

That's it. Share the site URL with the players.

## Running the game

- **Players:** open the site, type a name (optional), tap **Reveal my role**.
  Red screen means spy, green means clean. They tap **Hide** and pass the phone on.
- **Organizer:** open `/admin.html`, enter your `SPYCRAFT_ADMIN_KEY`, and tap
  **Show spies** to see exactly who the 5 spies are and the full roster with times.
- **New round:** on the admin page tap **Reset round** (or bump
  `SPYCRAFT_GAME_ID`). The next tap reshuffles a fresh deck with new spies.

Notes:

- Set `SPYCRAFT_TOTAL_PLAYERS` to match your group. If more people play than that,
  the extras are dealt in as clean players (green) and flagged in the admin view,
  so the game never breaks, it just still has exactly 5 spies among the first `N`.
- If fewer than 5 people play, everyone who plays could be a spy (the deck clamps
  the spy count to the number of players).

## Local development

```bash
npm install
npx netlify dev        # serves the page and functions, with local Blobs
```

Run the logic tests (no Netlify needed):

```bash
node --input-type=module -e "import('./netlify/functions/_game.mjs').then(async g => { \
  const s = g.initState({gameId:'t', total:20, spies:5}); \
  for (let i=0;i<20;i++) g.assign(s,'p'+i,'N'+i); \
  const spies = Object.values(s.assignments).filter(a=>a.role==='spy').length; \
  console.log('spies dealt:', spies); })"
```
