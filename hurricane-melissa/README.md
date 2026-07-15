# The Hurricane Melissa App Challenge

A subpage for the teen competition where every team builds its own version of the
same app, **Melissa Relief Connector**, and plans it first on an **AI App Canvas**
that they save to Netlify.

The page includes:

- An intro to the event and the shared brief, over a hurricane hero image
  (a NASA photo from Unsplash).
- The app description, what it must help a user do, and the assistance categories.
- Required features and stretch features.
- The mini lesson: seven questions before building an AI app, and the core lesson.
- The **interactive AI App Canvas** (a business-model-canvas style planner with all
  ten sections) that teams fill in and **save to Netlify**.
- Build-sprint roles, the suggested app-building prompt (with a copy button),
  the presentation format, and the judging criteria.

## The canvas saves to Netlify

Each team types a team name and fills in the ten canvas sections. **Save to Netlify**
stores their answers in a Netlify Blobs store, keyed by a slug of the team name, so:

- Answers survive a page reload and can be reopened on another device with the same
  team name (Reload saved work).
- The page also keeps a local backup in the browser, so nothing is lost if the
  network drops.
- Autosave runs a couple of seconds after the last edit once a team name is set.

## Files

```
hurricane-melissa/
  index.html                     the event page and the interactive canvas
  netlify.toml                   Netlify build + function config
  package.json                   depends on @netlify/blobs
  netlify/functions/
    canvas.mjs                   POST to save a team's canvas, GET to load it
    canvases.mjs                 GET (admin key): every team's canvas, for the facilitator
```

## Deploy to Netlify

1. Add a new site from this repo and set the **base directory** to
   `hurricane-melissa`. Netlify Blobs needs no setup.
2. Optional environment variables under Site settings, Environment variables:

   | Variable | Meaning | Default |
   | --- | --- | --- |
   | `HURRICANE_ADMIN_KEY` | Secret to view every team's canvas at `/api/canvases?key=...`. | none |
   | `HURRICANE_GAME_ID` | Change to start a fresh, separate set of team canvases. | `melissa-2026` |

3. Deploy. Netlify installs `@netlify/blobs` and publishes the functions.

Share the site URL with the teams. Ask each team to pick a **unique team name**, since
that name is how their canvas is saved and reloaded.

## Facilitator view

With `HURRICANE_ADMIN_KEY` set, fetch every team's saved canvas as JSON:

```
https://YOUR-SITE.netlify.app/api/canvases?key=YOUR_ADMIN_KEY
```

## Local development

```bash
npm install
npx netlify dev        # serves the page and the canvas save/load functions
```
