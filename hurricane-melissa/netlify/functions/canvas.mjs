// Save and load a team's AI App Canvas in Netlify Blobs.
//   POST /.netlify/functions/canvas   body: { team, members, data }  -> saves
//   GET  /.netlify/functions/canvas?team=<slug>                      -> loads
// Keyed by a slug of the team name, so a team reloads by typing the same name.
import { getStore } from "@netlify/blobs";

const GAME_ID = process.env.HURRICANE_GAME_ID || "melissa-2026";

function slug(s) {
  return String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}
function keyFor(teamSlug) { return `canvas:${GAME_ID}:${teamSlug}`; }

export default async (req) => {
  const store = getStore({ name: "hurricane-melissa", consistency: "strong" });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const teamSlug = slug(url.searchParams.get("team") || "");
    if (!teamSlug) return json({ error: "Missing team" }, 400);
    const rec = await store.get(keyFor(teamSlug), { type: "json" });
    if (!rec) return json({ found: false });
    return json({ found: true, team: rec.team, members: rec.members || "", data: rec.data || {}, updatedAt: rec.updatedAt });
  }

  if (req.method === "POST") {
    let body = {};
    try { body = await req.json(); } catch { /* ignore */ }
    const team = String(body.team || "").trim().slice(0, 60);
    const teamSlug = slug(team);
    if (!teamSlug) return json({ error: "Enter a team name before saving." }, 400);

    const record = {
      team,
      teamSlug,
      members: String(body.members || "").slice(0, 300),
      data: sanitize(body.data),
      updatedAt: Date.now(),
    };
    await store.setJSON(keyFor(teamSlug), record);
    return json({ ok: true, savedAt: record.updatedAt, team: teamSlug });
  }

  return json({ error: "Use GET or POST" }, 405);
};

// Keep only string / array-of-string values and cap sizes, so one team cannot
// store an unbounded or unexpected blob.
function sanitize(data) {
  const out = {};
  if (!data || typeof data !== "object") return out;
  for (const [k, v] of Object.entries(data)) {
    if (typeof k !== "string" || k.length > 40) continue;
    if (typeof v === "string") out[k] = v.slice(0, 4000);
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === "string").slice(0, 40).map((x) => x.slice(0, 120));
  }
  return out;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
